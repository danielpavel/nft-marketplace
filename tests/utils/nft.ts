import { web3, Provider } from "@coral-xyz/anchor";

import { generateSigner, percentAmount, Umi } from "@metaplex-foundation/umi";
import { createNft } from "@metaplex-foundation/mpl-token-metadata";

import { PublicKey } from "@solana/web3.js";

import {
  fromWeb3JsPublicKey,
  toWeb3JsPublicKey,
} from "@metaplex-foundation/umi-web3js-adapters";
import { getAssociatedTokenAddress } from "@solana/spl-token";

export async function mintNft({
  umi,
  provider,
  randomNumber,
  account,
  uri,
}: {
  umi: Umi;
  provider: Provider;
  randomNumber: number;
  account: PublicKey;
  uri?: string;
}) {
  const mint = generateSigner(umi);

  const balance = await umi.rpc.getBalance(umi.payer.publicKey);
  console.log("[creaNft] balance", balance);

  try {
    // Generate ATA for the NFT owner
    const ata = await getAssociatedTokenAddress(
      toWeb3JsPublicKey(mint.publicKey),
      account
    );
    const owner = fromWeb3JsPublicKey(account);

    const txBuilder = createNft(umi, {
      name: `Test Nft ${randomNumber}`,
      mint,
      token: fromWeb3JsPublicKey(ata),
      tokenOwner: owner,
      authority: umi.payer,
      sellerFeeBasisPoints: percentAmount(5),
      isCollection: false,
      uri,
    });

    let result = await txBuilder.sendAndConfirm(umi);

    return result;
  } catch (error) {
    const message = "[mintNft] Oops.. Something went wrong";

    if (error instanceof web3.SendTransactionError) {
      console.log(error.getLogs(provider.connection));
    }

    throw Error(`${message} ${error}`);
  }
}
