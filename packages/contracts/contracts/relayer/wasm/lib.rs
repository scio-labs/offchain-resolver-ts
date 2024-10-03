#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[zink::coating(Ownable2Step[
    Error = Error::NotAdmin
])]
#[ink::contract]
mod registration_proxy {
    use ink::env::call::{build_call, ExecutionInput, Selector};
    use ink::prelude::string::String;
    use ink::storage::Mapping;

    #[ink(event)]
    pub struct Success {
        id: u128,
        price: Balance,
    }

    #[ink(storage)]
    pub struct RegistrationProxy {
        admin: AccountId,
        /// Two-step ownership transfer AccountId
        pending_admin: Option<AccountId>,
        registry_addr: AccountId,
        controllers: Mapping<AccountId, ()>,
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
        /// Failed to register
        RegisterFailed(u8),
        /// Unable to retrieve the price
        PriceFetchFailed(u8),
    }

    impl RegistrationProxy {
        #[ink(constructor)]
        pub fn new(admin: AccountId, registry_addr: AccountId) -> Self {
            Self {
                admin,
                pending_admin: None,
                registry_addr,
                controllers: Mapping::default(),
            }
        }

        #[ink(message, payable)]
        pub fn fund_me(&mut self) -> Result<(), Error> {
            Ok(())
        }

        #[ink(message)]
        pub fn register(
            &mut self,
            id: u128,
            name: String,
            recipient: AccountId,
            years_to_register: u8,
            max_fees: Balance,
        ) -> Result<Balance, Error> {
            self.ensure_controller()?;

            let price = self.get_name_price(&name, recipient, years_to_register)?;
            if price > max_fees {
                return Err(Error::TooExpensive);
            } else if price > self.env().balance() {
                return Err(Error::InsufficientBalance);
            }

            const REGISTER_SELECTOR: [u8; 4] = ink::selector_bytes!("register_on_behalf_of");
            let result = build_call::<Environment>()
                .call(self.registry_addr)
                .call_v1()
                .exec_input(
                    ExecutionInput::new(Selector::new(REGISTER_SELECTOR))
                        .push_arg(name)
                        .push_arg(recipient)
                        .push_arg(years_to_register)
                        .push_arg::<Option<String>>(None)
                        .push_arg::<Option<String>>(None),
                )
                .returns::<core::result::Result<(), u8>>()
                .transferred_value(price)
                .params()
                .invoke();

            result.map_err(Error::RegisterFailed)?;

            self.env().emit_event(Success {
                id,
                price,
            });

            Ok(price)
        }

        #[ink(message)]
        pub fn set_controller(&mut self, controller: AccountId, enable: bool) -> Result<(), Error> {
            self.ensure_admin().expect("Not Authorised");

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
                .returns::<core::result::Result<(Balance, Balance, Balance, Option<AccountId>), u8>>()
                .params()
                .invoke();

            let (base_price, premium, _, _) = result.map_err(Error::PriceFetchFailed)?;
            let price = base_price.checked_add(premium).expect("Overflow");

            Ok(price)
        }

        fn ensure_controller(&self) -> Result<(), Error> {
            let caller = self.env().caller();
            self.controllers.get(caller).ok_or(Error::NotController)
        }
    }
}
