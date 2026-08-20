export const GET_STATISTIC = `
  query getStatistic($currency: String!, $amount: String!, $first: Int, $orderBy: BigInt, $orderDirection: String) {
    deposits(first: $first, orderBy: $orderBy, orderDirection: $orderDirection, where: { currency: $currency, amount: $amount }) {
      index
      timestamp
      blockNumber
    }  
  }
`

export const GET_WITHDRAWALS = `
  query getWithdrawals($currency: String!, $amount: String!, $first: Int, $fromBlock: Int!) {
    withdrawals(first: $first, orderBy: blockNumber, orderDirection: asc,
      where: { 
        currency: $currency,
        amount: $amount,
        blockNumber_gte: $fromBlock
      }) {
        to
        fee
        nullifier
        timestamp
        blockNumber
        transactionHash
      }
  }
`

export const GET_REGISTERED = `
  query getDeposits($first: Int, $fromBlock: Int) {
      relayers(first: $first, where: {
        blockRegistration_gte: $fromBlock
      }) {
       address
       ensName
       ensHash
       blockRegistration
    }
  }
`

export const GET_DEPOSITS = `
  query getDeposits($currency: String!, $amount: String!, $first: Int, $fromBlock: Int) {
    deposits(first: $first, orderBy: index, orderDirection: asc, where: { 
      amount: $amount,
      currency: $currency,
      blockNumber_gte: $fromBlock
    }) {
      index
      timestamp
      commitment
      blockNumber
      transactionHash
    }
  }
`

export const GET_NOTE_ACCOUNTS = `
  query getNoteAccount($address: String!) {
    noteAccounts(where: { address: $address }) {
      id
      index
      address
      encryptedAccount
    }
  }
`

export const GET_ENCRYPTED_NOTES = `
  query getEncryptedNotes($first: Int, $fromBlock: Int) {
    encryptedNotes(first: $first, orderBy: blockNumber, orderDirection: asc, where: { blockNumber_gte: $fromBlock }) {
      id
      index
      blockNumber
      encryptedNote
      transactionHash
    }
  }
`

export const GET_PROPOSALS = `
  query getProposals($first: Int, $skip: Int) {
    proposals(first: $first, skip: $skip, orderBy: proposalId, orderDirection: asc) {
      id
      proposalId
      proposer
      target
      startTime
      endTime
      description
      blockNumber
      transactionHash
      executed
    }
  }
`

export const GET_DELEGATES = `
  query getDelegates($delegatee: Bytes!) {
    delegates(first: 1000, orderBy: blockNumber, orderDirection: desc, where: { delegateTo: $delegatee }) {
      id
      account
      delegateTo
      blockNumber
    }
  }
`

export const GET_UNDELEGATES = `
  query getUndelegates($delegatee: Bytes!) {
    undelegates(first: 1000, orderBy: blockNumber, orderDirection: desc, where: { delegateFrom: $delegatee }) {
      id
      account
      delegateFrom
      blockNumber
    }
  }
`

export const GET_VOTED = `
  query getVoted($proposalId: Int!, $first: Int, $skip: Int, $fromBlock: Int) {
    votes(
      first: $first
      skip: $skip
      orderBy: blockNumber
      orderDirection: asc
      where: { proposalId: $proposalId, blockNumber_gte: $fromBlock }
    ) {
      id
      proposalId
      voter
      support
      votes
      blockNumber
      transactionHash
      from
      input
      timestamp
    }
  }
`

export const _META = `
  query getMeta {
    _meta {
      block {
        number
      }
    }
  }
`
