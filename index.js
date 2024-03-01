
// get data from redis
// check if it's overtime. if it's, set status to closed
// distribute nft to all the fid holders
//
// get user data by fid: https://docs.farcaster.xyz/reference/hubble/httpapi/userdata


import 'dotenv/config'
import { createClient, kv } from "@vercel/kv";
import axios from 'axios';
import { distributeNFTInHedera } from './hedera/index.js'

const fcHubEndpoint = 'https://nemes.farcaster.xyz:2281'

const main = async () => {
  // get all polls
  const SEVEN_DAYS_IN_MS = 1000 * 60 * 60 * 24 * 7;

  const polls = await kv.zrange('polls_by_date', Date.now() + SEVEN_DAYS_IN_MS, Date.now() - SEVEN_DAYS_IN_MS,  {byScore: true, rev: true, count: 100, offset: 0})

  for (const poll_id of polls) {
    console.log('poll_id', poll_id)
    const pollInfo = await kv.hgetall(`poll:${poll_id}`)
    const pollVotedInfo = await kv.smembers(`poll:${poll_id}:voted`)
    console.log('pollInfo', pollInfo)

    // check status
    if (pollInfo.status === 'open') {
      // if exceeds time then update tstatus to closed
      if (pollInfo.created_at + pollInfo.period > new Date().getTime()) {
        console.log('poll_id', poll_id)
        await updateStatus(poll_id, 'open', 'closed')
      }
    }
    // if (pollInfo.status === 'closed') {
    if (pollInfo.status === 'open') {
      // getWiners
      // const expectedPrice = pollInfo.expectedPrice
      const expectedPrice = 57000
      const currency = pollInfo.currency
      const currentPrice = await getPriceFromOracle(currency)
      let buttonId = 0
      if (expectedPrice < currentPrice) {
        buttonId = 1
      } else if (expectedPrice > currentPrice) {
        buttonId = 2
      }
      let winers = await kv.smembers(`poll:${poll_id}:voted:${buttonId}`)
      if (winers === null) {
        winers = []
      }
      console.log('get winers from redis: ', winers)
      await updateStatus(poll_id, 'closed', 'distributing') 
      const chain = 'hedera' // may switch
      await startToDistributeNFTs(winers, chain)

    } 
    // start to 
    // check market price for this poll
    // equals?
  }
}

const updateStatus = async (pollId, oldStatus, newStatus) => {
  console.log('poolId,', pollId, oldStatus, newStatus)
  const pollStatus = await kv.hget(`poll:${pollId}`, 'status')
  if (pollStatus === oldStatus) {
    console.log('getStatus', pollStatus, 'new Status:', newStatus)
    await kv.hset(`poll:${pollId}`, 'status', newStatus)
    console.log('update status finished')
  } else {
    console.error('status not updated', pollStatus, oldStatus)
  }
}

// market price
const getPriceFromOracle = (currency) => {
  if (currency === 'btc') {
    return 60000;
  }
  return 60000;
}
      
const startToDistributeNFTs = async (winers, chain) => {
  for (const winer of winers) {
    const address = await getAddressFromFID(winer)
    if (address === null) {
      console.log('[missing distribute] as a winer, user do not have verified eth address', winer)
    }
    console.log('distribute nfts to ', winer, address)
    if (chain === 'hedera') {
      console.log('[distribute nft]start to distribute nft in chain', chain, 'for', address)
      await distributeNFTInHedera(address)
      console.log('[distribute nft] finished to distribute nft for winer', addresss)
    }
  }
}

const getAddressFromFID = async (fid) => {
  const result = await axios.get(`${fcHubEndpoint}/v1/verificationsByFid?fid=${fid}`)
  const userInfo = result.data
  // console.log('userInfo raw', userInfo)
  if (userInfo.messages && userInfo.messages[0]) {
    return userInfo.messages[0].data.verificationAddEthAddressBody.address
  } else {
    console.error('[error][getAddressFromFID]', fid, 'no verified address')
    return null
  }
}
main()
