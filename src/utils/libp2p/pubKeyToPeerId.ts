import PeerId from 'peer-id'
import {keys as libp2p_crypto } from 'libp2p-crypto'

const COMPRESSED_PUBLIC_KEY_LENGTH = 33

/**
 * Converts a plain compressed ECDSA public key over the curve `secp256k1`
 * to a peerId in order to use it with libp2p.
 *
 * @notice Libp2p stores the keys in format that is derived from `protobuf`.
 * Using `libsecp256k1` directly does not work.
 *
 * @param {Buffer | string} pubKey the plain public key
 * @returns {Promise<PeerId>}
 */
export default function pubKeyToPeerId(pubKey: Buffer) {
    if (pubKey.length != COMPRESSED_PUBLIC_KEY_LENGTH)
        throw Error(`Invalid public key. Expected a buffer of size ${COMPRESSED_PUBLIC_KEY_LENGTH} bytes. Got one of ${pubKey.length} bytes.`)

    pubKey = new libp2p_crypto.supportedKeys.secp256k1.Secp256k1PublicKey(pubKey)

    return PeerId.createFromPubKey(pubKey.bytes)
}