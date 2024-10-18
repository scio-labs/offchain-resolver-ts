import { defineConfig } from '@wagmi/cli'
import { hardhat } from '@wagmi/cli/plugins'

export default defineConfig({
  out: 'wagmi.generated.ts',
  contracts: [],
  plugins: [
    hardhat({
      project: '../contracts',
    }),
  ],
})
