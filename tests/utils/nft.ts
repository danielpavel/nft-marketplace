import { web3, Provider } from "@coral-xyz/anchor";

import {
  generateSigner,
  KeypairSigner,
  percentAmount,
  PublicKey,
  Umi,
} from "@metaplex-foundation/umi";
import {
  createNft,
  findMetadataPda,
  verifyCollectionV1,
} from "@metaplex-foundation/mpl-token-metadata";

import {
  fromWeb3JsPublicKey,
  toWeb3JsPublicKey,
} from "@metaplex-foundation/umi-web3js-adapters";
import { getAssociatedTokenAddress } from "@solana/spl-token";

async function createCollectionNft(umi: Umi) {
  const collectionMint = generateSigner(umi);

  const result = await createNft(umi, {
    mint: collectionMint,
    name: "My Collection",
    uri: "https://arweave.net/123",
    sellerFeeBasisPoints: percentAmount(5.5), // 5.5%
    isCollection: true,
  }).sendAndConfirm(umi);

  return result.result.value.err ? null : collectionMint;
}

async function mintNft({
  umi,
  randomNumber,
  account,
  collection,
}: {
  umi: Umi;
  randomNumber: number;
  account: web3.PublicKey;
  collection: PublicKey;
}) {
  const mint = generateSigner(umi);

  try {
    // Generate ATA for the NFT owner
    const ata = await getAssociatedTokenAddress(
      toWeb3JsPublicKey(mint.publicKey),
      account
    );
    const owner = fromWeb3JsPublicKey(account);

    const txBuilder = createNft(umi, {
      name: `My Nft ${randomNumber}`,
      mint,
      token: fromWeb3JsPublicKey(ata),
      tokenOwner: owner,
      authority: umi.payer,
      sellerFeeBasisPoints: percentAmount(5),
      isCollection: false,
      collection: { key: collection, verified: false },
      uri: "https://arweave.net/123",
    });

    let result = await txBuilder.sendAndConfirm(umi);

    if (result.result.value.err) {
      return null;
    }

    return { mint, ata };
  } catch (error) {
    throw Error(`[mintNft] ${error}`);
  }
}

export async function createAndMintNftForCollection(
  umi: Umi,
  randomNumber: number,
  account: web3.PublicKey
) {
  try {
    const collection = await createCollectionNft(umi);
    const { mint, ata } = await mintNft({
      umi,
      randomNumber,
      account,
      collection: collection.publicKey,
    });

    // first find the metadata PDA to use later
    const metadata = findMetadataPda(umi, {
      mint: mint.publicKey,
    });

    await verifyCollectionV1(umi, {
      metadata,
      collectionMint: collection.publicKey,
      authority: umi.payer,
    }).sendAndConfirm(umi);

    return {
      mint: toWeb3JsPublicKey(mint.publicKey),
      ata,
      collection: toWeb3JsPublicKey(collection.publicKey),
    };
  } catch (err) {
    throw Error(`[createAndMintNftForCollection] ${err}`);
  }
}
