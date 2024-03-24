import { FrameRequest, getFrameMessage } from '@coinbase/onchainkit/frame';
import { NextRequest, NextResponse } from 'next/server';
import { encodeFunctionData, parseEther } from 'viem';
import { baseSepolia } from 'viem/chains';
import abi from '../../_contracts/CounterUC';
import { COUNTER_ADDR } from '../../config';
import type { FrameTransactionResponse } from '@coinbase/onchainkit/frame';
const hre = require('hardhat');
// const { getConfigPath } = require('./private/_helpers');
// const { getIbcApp } = require('./private/_vibc-helpers.js');

function getConfigPath() {
  const path = require('path');
  const configRelativePath = process.env.CONFIG_PATH ? process.env.CONFIG_PATH : 'config.json';
  // console.log(`📔 Using config file at ${configRelativePath}`);
  const configPath = path.join(__dirname, '../..', configRelativePath);
  return configPath;
}

async function getIbcApp(network: any) {
  try {
    const config = require(getConfigPath());
    const ibcAppAddr = config.isUniversal
      ? config['sendUniversalPacket'][`${network}`]['portAddr']
      : config['sendPacket'][`${network}`]['portAddr'];
    console.log(`🗄️  Fetching IBC app on ${network} at address: ${ibcAppAddr}`);
    const contractType = config['deploy'][`${network}`];
    const ibcApp = await hre.getContractAt(`${contractType}`, ibcAppAddr);
    return ibcApp;
  } catch (error) {
    console.log(`❌ Error getting IBC app: ${error}`);
    return;
  }
}

async function sendPacket() {
  const accounts = await hre.ethers.getSigners();
  const config = require(getConfigPath());
  const sendConfig = config.sendPacket;

  const networkName = hre.network.name;
  // Get the contract type from the config and get the contract
  const ibcApp = await getIbcApp(networkName);

  // Do logic to prepare the packet
  const channelId = sendConfig[`${networkName}`]['channelId'];
  const channelIdBytes = hre.ethers.encodeBytes32String(channelId);
  const timeoutSeconds = sendConfig[`${networkName}`]['timeout'];

  // Send the packet
  await ibcApp.connect(accounts[0]).sendPacket(
    channelIdBytes,
    timeoutSeconds,
    // Define and pass optionalArgs appropriately or remove if not needed
  );
}

async function getResponse(req: NextRequest): Promise<NextResponse | Response> {
  const body: FrameRequest = await req.json();
  const { isValid } = await getFrameMessage(body, {
    neynarApiKey: 'B04693F7-E8AF-4AD2-A490-852784C2C374',
  });

  if (!isValid) {
    return new NextResponse('Message not valid', { status: 500 });
  }
  const accounts = await hre.ethers.getSigners();
  const config = require(getConfigPath());
  const sendConfig = config.sendPacket;

  const networkName = hre.network.name;
  // Get the contract type from the config and get the contract
  const ibcApp = await getIbcApp(networkName);

  // Do logic to prepare the packet
  const channelId = sendConfig[`${networkName}`]['channelId'];
  const channelIdBytes = hre.ethers.encodeBytes32String(channelId);
  const timeoutSeconds = sendConfig[`${networkName}`]['timeout'];

  const data = encodeFunctionData({
    abi: abi,
    functionName: 'sendUniversalPacket',
    args: ['0x7f525e27eE291feBFa9b447E75e9249aA607fE09', channelIdBytes, timeoutSeconds],
  });

  const txData: FrameTransactionResponse = {
    chainId: `eip155:${baseSepolia.id}`, // Remember Base Sepolia might not work on Warpcast yet
    method: 'eth_sendTransaction',
    params: {
      abi: [],
      data,
      to: COUNTER_ADDR,
      value: parseEther('0.000004').toString(), // 0.00004 ETH
    },
  };
  return NextResponse.json(txData);
}

export async function POST(req: NextRequest): Promise<Response> {
  return getResponse(req);
}

export const dynamic = 'force-dynamic';
