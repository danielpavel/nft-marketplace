import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Commitment, Umi } from "@metaplex-foundation/umi";
import { NftMarketplace } from "../target/types/nft_marketplace";
import { mintNft } from "./utils/nft";
import { initUmi } from "./utils/umi";

const commitment: Commitment = "confirmed"; // processed, confirmed, finalized

describe("nft-marketplace", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();

  const program = anchor.workspace.NftMarketplace as Program<NftMarketplace>;

  let umi: Umi;

  let user1 = anchor.web3.Keypair.generate();
  let user2 = anchor.web3.Keypair.generate();

  before(async () => {
    await Promise.all(
      [user1, user2].map(async (k) => {
        return await anchor
          .getProvider()
          .connection.requestAirdrop(
            k.publicKey,
            10 * anchor.web3.LAMPORTS_PER_SOL
          );
      })
    ).then(confirmTxs);

    const user1Balance = await provider.connection.getBalance(user1.publicKey);
    const user2Balance = await provider.connection.getBalance(user2.publicKey);
    const providerBalance = await provider.connection.getBalance(
      provider.publicKey
    );

    console.log("User1 balance", user1Balance);
    console.log("User2 balance", user2Balance);
    console.log("Provider balance", providerBalance);

    umi = initUmi(provider);

    await new Promise((resolve) => setTimeout(resolve, 5000));

    const result = await mintNft({
      umi,
      provider,
      randomNumber: 1,
      account: user1.publicKey,
      uri: "https://arweave.net/123",
    });

    console.log("Minted NFT", result);
  });

  it("Is initialized!", async () => {
    // Add your test here.
    // const tx = await program.methods.initialize().rpc();
    // console.log("Your transaction signature", tx);
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
