import * as ethers from "ethers";
import dotenv from "dotenv";
import fs from "fs";
import PriceOracleV3ABI from "./abi/PriceOracleV3ABI";
import PriceFeedABI from "./abi/PriceFeedABI";
import { PRICE_ORACLE_V3 } from "./constant";
import { lpPriceFeedTypes } from "@gearbox-protocol/sdk-gov";

dotenv.config();

const provider = new ethers.AlchemyProvider(
  1,
  process.env.ALCHEMY_API_KEY ?? "",
);

const priceOracleV3Contract = new ethers.Contract(
  PRICE_ORACLE_V3,
  PriceOracleV3ABI,
  provider,
);

const priceFeedInterface = new ethers.Interface(PriceFeedABI);

const writeFile = (
  target: string,
  value: string,
  signature: string,
  data: string,
) => {
  let txs = [];
  try {
    const content = fs.readFileSync("out.json").toString("utf-8");
    txs = JSON.parse(content);
  } catch (err) {
    txs = [];
  }
  fs.writeFileSync(
    "out.json",
    JSON.stringify([...txs, { target, value, signature, data }]),
  );
};

priceOracleV3Contract.on(
  "SetPriceFeed",
  async (token, priceFeed, stalenessPeriod, skipCheck, trusted) => {
    try {
      const priceFeedContract = new ethers.Contract(
        priceFeed,
        PriceOracleV3ABI,
        provider,
      );

      const priceFeedType = await priceFeedContract.priceFeedType();
      const latestRoundData = await priceFeedContract.latestRoundData();

      if (lpPriceFeedTypes.findIndex(priceFeedType) === -1) {
        return;
      }

      const lowerBound =
        ((latestRoundData?.[1] ?? BigInt(0)) * BigInt(99)) / BigInt(100);

      const data = priceFeedInterface.encodeFunctionData("setLimiter", [
        lowerBound,
      ]);

      writeFile(priceFeed, lowerBound.toString(), "setLimiter(uint256)", data);
    } catch (err) {
      console.log(err);
    }
  },
);
