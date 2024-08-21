import { Provider, web3 } from "@coral-xyz/anchor";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import {
  createSignerFromKeypair,
  signerIdentity,
} from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { fromWeb3JsKeypair } from "@metaplex-foundation/umi-web3js-adapters";

export function initUmi(provider: Provider) {
  const umi = createUmi(provider.connection.rpcEndpoint);
  let providerKeypair = provider.wallet.payer as web3.Keypair;

  const myKeypairSigner = createSignerFromKeypair(
    umi,
    fromWeb3JsKeypair(providerKeypair)
  );

  umi.use(signerIdentity(myKeypairSigner));
  umi.use(mplTokenMetadata());

  return umi;
}
