#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[zink::coating(Ownable2Step[
    Error = Error::NotAdmin
])]
#[ink::contract]
mod registration_proxy {
    use ink::env::call::{build_call, ExecutionInput, Selector};
    use ink::prelude::string::String;
    use ink::prelude::vec::Vec;
    use ink::storage::Mapping;

    #[ink(event)]
    pub struct Success {
        id: u128,
        price: Balance,
    }

    #[derive(Debug)]
    #[ink::scale_derive(Encode, Decode, TypeInfo)]
    pub enum InnerResult {
        Pass(Balance),
        Fail(Error),
    }

    #[ink(storage)]
    pub struct RegistrationProxy {
        admin: AccountId,
        /// Two-step ownership transfer AccountId
        pending_admin: Option<AccountId>,
        registry_addr: AccountId,
        controllers: Mapping<AccountId, ()>,
        used_ids: Mapping<u128, ()>,
    }

    #[derive(Debug)]
    #[ink::scale_derive(Encode, Decode, TypeInfo)]
    pub enum Error {
        /// Caller not allowed to call privileged calls.
        NotAdmin,
        /// Caller is not approved as controller
        NotController,
        /// Insufficient balance in the contract
        InsufficientBalance,
        /// Price exceeds the mentioned cap
        TooExpensive,
        /// Given Id is already used
        DuplicateId,
        /// Failed to register
        RegisterFailed(u8),
        /// Failed to register with Id not marked
        RegisterFailedWithRevert(u8),
        /// Unable to retrieve the price
        PriceFetchFailed(u8),
    }

    impl RegistrationProxy {
        #[ink(constructor, payable)]
        pub fn new(admin: AccountId, registry_addr: AccountId) -> Self {
            let mut contract = Self {
                admin,
                pending_admin: None,
                registry_addr,
                controllers: Mapping::default(),
                used_ids: Mapping::default(),
            };

            contract.controllers.insert(admin, &());
            contract
        }

        #[ink(message, payable)]
        pub fn fund_me(&mut self) -> Result<(), Error> {
            Ok(())
        }

        #[ink(message)]
        pub fn withdraw_funds(
            &mut self,
            account: AccountId,
            balance: Balance,
        ) -> Result<(), Error> {
            self.ensure_admin()?;
            self.env()
                .transfer(account, balance)
                .map_err(|_| Error::InsufficientBalance)
        }

        #[ink(message)]
        pub fn register(
            &mut self,
            id: u128,
            name: String,
            recipient: AccountId,
            years_to_register: u8,
            records: Vec<(String, String)>,
            max_fees: Balance,
        ) -> Result<InnerResult, Error> {
            self.ensure_controller()?;
            self.ensure_unqiue_id(id)?;

            let price = match self.get_name_price(&name, recipient, years_to_register) {
                Ok(price) => price,
                Err(err) => return Ok(InnerResult::Fail(err)),
            };
            if price > max_fees {
                return Ok(InnerResult::Fail(Error::TooExpensive));
            } else if price > self.env().balance() {
                return Ok(InnerResult::Fail(Error::InsufficientBalance));
            }

            // register with custody
            let result = self.do_register(&name, years_to_register, price);
            if let Err(e) = result {
                return Ok(InnerResult::Fail(Error::RegisterFailed(e)));
            }

            // set metadata and then transfer name ownership
            // TODO: evaluate if this action can ever fail (leaving behind unmarked id)
            // TODO: if yes, then explore attack vector(s) (result: free domain)
            self.do_set_metadata(&name, records)
                .map_err(Error::RegisterFailedWithRevert)?;
            self.do_transfer_name(&name, &recipient)
                .map_err(Error::RegisterFailedWithRevert)?;

            self.env().emit_event(Success { id, price });

            Ok(InnerResult::Pass(price))
        }

        #[ink(message)]
        pub fn set_controller(&mut self, controller: AccountId, enable: bool) -> Result<(), Error> {
            self.ensure_admin()?;

            if enable {
                self.controllers.insert(controller, &());
            } else {
                self.controllers.remove(controller);
            }

            Ok(())
        }

        #[ink(message)]
        pub fn is_controller(&self, controller: AccountId) -> bool {
            self.controllers.contains(controller)
        }

        #[ink(message)]
        pub fn is_used_id(&self, id: u128) -> bool {
            self.used_ids.contains(id)
        }

        #[ink(message)]
        pub fn upgrade_contract(&mut self, code_hash: Hash) {
            self.ensure_admin().expect("Not Authorised");

            self.env().set_code_hash(&code_hash).unwrap_or_else(|err| {
                panic!(
                    "Failed to `set_code_hash` to {:?} due to {:?}",
                    code_hash, err
                )
            });
            ink::env::debug_println!("Switched code hash to {:?}.", code_hash);
        }

        fn do_register(&self, name: &str, years_to_register: u8, price: u128) -> Result<(), u8> {
            const REGISTER_SELECTOR: [u8; 4] = ink::selector_bytes!("register_v2");

            let referrer: Option<String> = None;
            let bonus_name: Option<String> = None;
            let set_as_primary_name = false;

            build_call::<Environment>()
                .call(self.registry_addr)
                .call_v1()
                .exec_input(
                    ExecutionInput::new(Selector::new(REGISTER_SELECTOR))
                        .push_arg(name)
                        .push_arg(years_to_register)
                        .push_arg(referrer)
                        .push_arg(bonus_name)
                        .push_arg(set_as_primary_name),
                )
                .returns::<core::result::Result<(), u8>>()
                .transferred_value(price)
                .params()
                .invoke()
        }

        fn do_set_metadata(&self, name: &str, records: Vec<(String, String)>) -> Result<(), u8> {
            const UPDATE_RECORDS_SELECTOR: [u8; 4] = ink::selector_bytes!("update_records");

            let records: Vec<(String, Option<String>)> =
                records.into_iter().map(|(k, v)| (k, Some(v))).collect();
            let remove_rest = true;

            build_call::<Environment>()
                .call(self.registry_addr)
                .call_v1()
                .exec_input(
                    ExecutionInput::new(Selector::new(UPDATE_RECORDS_SELECTOR))
                        .push_arg(name)
                        .push_arg(records)
                        .push_arg(remove_rest),
                )
                .returns::<core::result::Result<(), u8>>()
                .params()
                .invoke()
        }

        fn do_transfer_name(&self, name: &str, to: &AccountId) -> Result<(), u8> {
            const TRANSFER_SELECTOR: [u8; 4] = ink::selector_bytes!("transfer");

            let keep_records = true;
            let keep_controller = false;
            let keep_resolving = false;
            let data: Vec<u8> = Vec::new();

            build_call::<Environment>()
                .call(self.registry_addr)
                .call_v1()
                .exec_input(
                    ExecutionInput::new(Selector::new(TRANSFER_SELECTOR))
                        .push_arg(to)
                        .push_arg(name)
                        .push_arg(keep_records)
                        .push_arg(keep_controller)
                        .push_arg(keep_resolving)
                        .push_arg(data),
                )
                .returns::<core::result::Result<(), u8>>()
                .params()
                .invoke()
        }

        fn get_name_price(
            &self,
            name: &str,
            recipient: AccountId,
            years_to_register: u8,
        ) -> Result<Balance, Error> {
            const GET_NAME_PRICE_SELECTOR: [u8; 4] = ink::selector_bytes!("get_name_price");

            let result = build_call::<Environment>()
                .call(self.registry_addr)
                .call_v1()
                .exec_input(
                    ExecutionInput::new(Selector::new(GET_NAME_PRICE_SELECTOR))
                        .push_arg(name)
                        .push_arg(recipient)
                        .push_arg(years_to_register)
                        .push_arg::<Option<String>>(None),
                )
                .returns::<core::result::Result<(Balance, Balance, Balance, Option<AccountId>), u16>>()
                .params()
                .invoke();

            let (base_price, premium, _, _) =
                result.map_err(|e| Error::PriceFetchFailed((e >> 8) as u8))?;
            let price = base_price.checked_add(premium).expect("Overflow");

            Ok(price)
        }

        fn ensure_controller(&self) -> Result<(), Error> {
            let caller = self.env().caller();
            self.controllers.get(caller).ok_or(Error::NotController)
        }

        fn ensure_unqiue_id(&mut self, id: u128) -> Result<(), Error> {
            if self.used_ids.contains(id) {
                return Err(Error::DuplicateId);
            }
            self.used_ids.insert(id, &());
            Ok(())
        }
    }
}
