/* eslint-disable no-console */
/* eslint-disable import/order */

import { utils } from 'ethers'
import uniqBy from 'lodash/uniqBy'

import { graph, lookupAddresses } from '@/services'

const { toWei, fromWei, toBN, toChecksumAddress } = require('web3-utils')

const parseComment = (calldata, govInstance) => {
  const empty = { contact: '', message: '' }
  if (!calldata || !govInstance) return empty

  try {
    const methodLength = 4 // length of castDelegatedVote method
    const result = utils.defaultAbiCoder.decode(
      ['address[]', 'uint256', 'bool'],
      utils.hexDataSlice(calldata, methodLength)
    )
    const data = govInstance.methods.castDelegatedVote(...result).encodeABI()
    const dataLength = utils.hexDataLength(data)

    const str = utils.defaultAbiCoder.decode(['string'], utils.hexDataSlice(calldata, dataLength))
    const [contact, message] = JSON.parse(str)
    return { contact, message }
  } catch {
    return empty
  }
}

const createProposalComment = (resultAll, votedEvent) => {
  const { transactionHash, returnValues, blockNumber } = votedEvent
  const { voter } = returnValues

  const comment = parseComment()

  const percentage =
    toBN(votedEvent.returnValues.votes)
      .mul(toBN(10000))
      .divRound(resultAll)
      .toNumber() / 100

  return {
    id: `${transactionHash}-${voter}`,
    percentage,
    ...returnValues,
    votes: fromWei(returnValues.votes),
    transactionHash,
    blockNumber,

    ...comment,

    from: votedEvent.from || null,
    input: votedEvent.input || null,

    ens: {
      delegator: null,
      voter: null
    },
    delegator: null,
    timestamp: votedEvent.timestamp || null
  }
}

const state = () => {
  return {
    isFetchingComments: false,
    isFetchingMessages: false,
    ensNames: {},
    comments: []
  }
}

const getters = {
  comments: (state) => {
    const { ensNames } = state
    let comments = state.comments.slice()

    comments.sort((a, b) => b.blockNumber - a.blockNumber)
    comments = uniqBy(comments, 'voter')
    comments.sort((a, b) => b.percentage - a.percentage)

    comments = comments.map((data) => ({
      ...data,
      ens: {
        delegator: ensNames[data.delegator],
        voter: ensNames[data.voter]
      }
    }))

    return comments
  }
}

const mutations = {
  SAVE_FETCHING_COMMENTS(state, status) {
    state.isFetchingComments = status
  },
  SAVE_FETCHING_MESSAGES(state, status) {
    state.isFetchingMessages = status
  },
  SAVE_ENS_NAMES(state, ensNames) {
    state.ensNames = { ...state.ensNames, ...ensNames }
  },
  SAVE_COMMENTS(state, comments) {
    state.comments = comments
  }
}

const actions = {
  async fetchComments(context, proposal) {
    const { commit, dispatch, state } = context
    let { comments } = state
    let newComments = []

    if (comments[0]?.id !== proposal.id) {
      commit('SAVE_COMMENTS', [])
      comments = []
    }

    commit('SAVE_FETCHING_COMMENTS', true)
    newComments = await dispatch('fetchVotedEvents', { proposal, comments })
    commit('SAVE_FETCHING_COMMENTS', false)

    if (!newComments) return
    commit('SAVE_COMMENTS', newComments.concat(comments))
    dispatch('fetchEnsNames', { comments: newComments })

    commit('SAVE_FETCHING_MESSAGES', true)
    // TODO: TC-163 - add pagination
    newComments = await dispatch('fetchCommentsMessages', { comments: newComments })
    commit('SAVE_FETCHING_MESSAGES', false)

    if (!newComments) return
    commit('SAVE_COMMENTS', newComments.concat(comments))
  },
  async fetchVotedEvents(context, { proposal, comments }) {
    const { rootGetters } = context
    let { blockNumber: fromBlock } = proposal

    const netId = rootGetters['metamask/netId']

    if (comments[0]?.id === proposal.id) {
      fromBlock = comments[0].blockNumber + 1
    }

    try {
      let votedEvents = []

      if (netId === 1) {
        votedEvents = await graph.getProposalVotes({ proposalId: proposal.id, fromBlock })
      }

      console.log('fetchVotedEvents', votedEvents.length)

      votedEvents = votedEvents
        .sort((a, b) => b.blockNumber - a.blockNumber)
        .map((vote) => ({
          transactionHash: vote.transactionHash,
          blockNumber: vote.blockNumber,
          returnValues: {
            proposalId: vote.proposalId,
            voter: toChecksumAddress(vote.voter),
            support: vote.support,
            votes: vote.votes
          },
          from: vote.from ? toChecksumAddress(vote.from) : null,
          input: vote.input || null,
          timestamp: vote.timestamp || null
        }))
      votedEvents = uniqBy(votedEvents, 'returnValues.voter')

      console.log('fetchVotedEvents uniq', votedEvents.length)

      const resultAll = toBN(toWei(proposal.results.for)).add(toBN(toWei(proposal.results.against)))
      let newComments = votedEvents.map((votedEvent) => createProposalComment(resultAll, votedEvent))
      newComments = newComments.concat(comments)
      return newComments
    } catch (e) {
      console.error('fetchVotedEvents', e.message)
      return null
    }
  },
  fetchCommentsMessages(context, { comments }) {
    const { rootGetters } = context

    const netId = rootGetters['metamask/netId']
    const govInstance = rootGetters['governance/gov/govContract']({ netId })

    try {
      return comments.map((comment) => {
        try {
          const { voter, from, input, timestamp } = comment

          const isSelfVote = Boolean(from) && voter === from
          const message = input ? parseComment(input, govInstance) : {}

          return {
            ...comment,
            ...message,

            delegator: from ? (isSelfVote ? null : from) : comment.delegator,
            timestamp: timestamp || comment.timestamp
          }
        } catch (e) {
          console.error('fetchCommentsMessages', comment.id, e.message)
          return comment
        }
      })
    } catch (e) {
      console.error('fetchCommentsMessages', e.message)
    }
  },
  async fetchEnsNames(context, { comments }) {
    const { rootGetters, commit } = context

    const netId = rootGetters['metamask/netId']
    const web3 = rootGetters['governance/gov/getWeb3']({ netId })

    try {
      const addresses = comments
        .map((_) => _.voter)
        .flat()
        .filter(Boolean)

      console.log('fetchEnsNames', addresses.length)

      const ensNames = await lookupAddresses(addresses, web3)

      commit('SAVE_ENS_NAMES', ensNames)
    } catch (e) {
      console.error('fetchEnsNames', e.message)
    }
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}
