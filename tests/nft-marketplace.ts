import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Commitment, KeypairSigner, Umi } from "@metaplex-foundation/umi";
import { NftMarketplace } from "../target/types/nft_marketplace";
import { mintNft } from "./utils/nft";
import { initUmi } from "./utils/umi";

import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { expect } from "chai";

const commitment: Commitment = "finalized"; // processed, confirmed, finalized

describe("nft-marketplace", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();

  const program = anchor.workspace.NftMarketplace as Program<NftMarketplace>;

  let umi: Umi;

  let initializer = anchor.web3.Keypair.generate();
  let user1 = anchor.web3.Keypair.generate();
  let user2 = anchor.web3.Keypair.generate();

  let nft1: { mint: KeypairSigner; ata: anchor.web3.PublicKey };
  let nft2: { mint: KeypairSigner; ata: anchor.web3.PublicKey };

  before(async () => {
    await Promise.all(
      [initializer, user1, user2].map(async (k) => {
        return await anchor
          .getProvider()
          .connection.requestAirdrop(
            k.publicKey,
            10 * anchor.web3.LAMPORTS_PER_SOL
          );
      })
    ).then(confirmTxs);

    console.log("🟢 Airdrop Done!");

    umi = initUmi(provider);

    // We need to wait for the transaction to be confirmed
    // await new Promise((resolve) => setTimeout(resolve, 13000));

    try {
      const result1 = await mintNft({
        umi,
        provider,
        randomNumber: 1,
        account: user1.publicKey,
        uri: "https://arweave.net/123",
      });

      if (result1.result.result.value.err) {
        throw new Error(result1.result.result.value.err.toString());
      }

      const result2 = await mintNft({
        umi,
        provider,
        randomNumber: 2,
        account: user2.publicKey,
        uri: "https://arweave.net/123",
      });

      if (result2.result.result.value.err) {
        throw new Error(result1.result.result.value.err.toString());
      }

      nft1 = { mint: result1.mint, ata: result1.ata };
      nft2 = { mint: result2.mint, ata: result2.ata };
    } catch (error) {
      console.error(`[mintNft] Oops.. Something went wrong: ${error}`);
    }
  });

  it("Initialize Marketplace", async () => {
    const name = "Penny Auction NFT Marketplace";
    const fee = 500; // 5% in basis points

    const [marketplace, marketplaceBump] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          anchor.utils.bytes.utf8.encode("marketplace"),
          anchor.utils.bytes.utf8.encode(name),
        ],
        program.programId
      );

    const [rewardsMint, rewardsBump] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [anchor.utils.bytes.utf8.encode("rewards"), marketplace.toBuffer()],
        program.programId
      );

    let accounts = {
      admin: initializer.publicKey,
      marketplace,
      rewardsMint,
      tokenProgram: TOKEN_PROGRAM_ID,
    };

    try {
      let tx = await program.methods
        .initialize(name, fee)
        .accounts(accounts)
        .signers([initializer])
        .rpc();

      const marketplaceAccount = await program.account.marketplace.fetch(
        marketplace
      );

      expect(marketplaceAccount.name).to.be.equal(name);
      expect(marketplaceAccount.fee).to.be.equal(fee);
      expect(marketplaceAccount.bump).to.be.equal(marketplaceBump);
      expect(marketplaceAccount.admin).deep.equal(initializer.publicKey);
      expect(marketplaceAccount.rewardsBumps).to.be.equal(rewardsBump);

      console.log("Your transaction signature", tx);
    } catch (err) {
      console.error(err);
    }
  });
});

// Helpers
const confirmTx = async (signature: string) => {
  const latestBlockhash = await anchor
    .getProvider()
    .connection.getLatestBlockhash();
  await anchor.getProvider().connection.confirmTransaction(
    {
      signature,
      ...latestBlockhash,
    },
    commitment
  );
};

const confirmTxs = async (signatures: string[]) => {
  await Promise.all(signatures.map(confirmTx));
};
