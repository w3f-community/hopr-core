import { keys } from 'libp2p-crypto'
import { LevelUp } from 'levelup'
import { deserializeKeyPair, serializeKeyPair, privKeyToPeerId } from '..'

import PeerInfo from 'peer-info'
import PeerId from 'peer-id'
const Multiaddr = require('multiaddr')

import { NAME } from '../../constants'

async function getPeerInfo(
  options: {
    id?: number
    bootstrapNode?: boolean
    peerId?: PeerId
    peerInfo?: PeerInfo
    addrs?: any[]
  },
  db?: LevelUp
): Promise<PeerInfo> {
  /**
   * Check whether our config makes sense
   */
  function checkConfig(): void {
    if (!process.env.HOST_IPV4 && !process.env.HOST_IPV6) {
      throw Error('Unable to start node without an address. Please provide at least one.')
    }

    if (!process.env.PORT) {
      throw Error('Got no port to listen on. Please specify one.')
    }
  }

  /**
   * Try to retrieve Id from database
   */
  async function getFromDatabase(): Promise<PeerId> {
    try {
      const serializedKeyPair = await db.get('key-pair')

      return deserializeKeyPair(serializedKeyPair)
    } catch (err) {
      if (err != null && err.notFound == true) {
        throw err
      }

      const key = await keys.generateKeyPair('secp256k1', 256)
      const peerId = await PeerId.createFromPrivKey(key.bytes)

      const serializedKeyPair = await serializeKeyPair(peerId)
      await db.put('key-pair', serializedKeyPair)

      return peerId
    }
  }

  /**
   * Assemble the addresses that we are using
   */
  function getAddrs(): any[] {
    const addrs = []

    let port = process.env.PORT

    if (process.env.HOST_IPV4) {
      // ============================= Only for testing ============================================================
      if (options != null && Number.isInteger(options.id)) port = (Number.parseInt(process.env.PORT) + (options.id + 1) * 2).toString()
      // ===========================================================================================================
      addrs.push(Multiaddr(`/ip4/${process.env.HOST_IPV4}/tcp/${port}`))
    }

    // if (process.env.HOST_IPV6) {
    //     // ============================= Only for testing ============================================================
    //     if (Number.isInteger(options.id)) port = (Number.parseInt(process.env.PORT) + (options.id + 1) * 2).toString()
    //     // ===========================================================================================================
    //     addrs.push(Multiaddr(`/ip6/${process.env.HOST_IPV6}/tcp/${Number.parseInt(port) + 1}`))
    // }

    return addrs
  }

  /**
   * Checks whether we have gotten any peerId in through the options.
   */
  async function getPeerId(): Promise<PeerId> {
    if (options != null && options.peerId != null && PeerId.isPeerId(options.peerId)) {
      return options.peerId
    }

    return getFromDatabase()
  }

  if (db == null && options == null && options.peerInfo == null && options.peerId == null) {
    throw Error('Invalid input parameter. Please set a valid peerInfo or pass a database handle.')
  }

  checkConfig()

  options.addrs = getAddrs()

  const peerInfo = new PeerInfo(await getPeerId())
  options.addrs.forEach(addr => peerInfo.multiaddrs.add(addr.encapsulate(`/${NAME}/${peerInfo.id.toB58String()}`)))

  return peerInfo
}

export { getPeerInfo }
