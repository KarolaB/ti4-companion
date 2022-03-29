import React, { useMemo, useState, useCallback, useContext } from 'react'
import { useParams, useHistory } from 'react-router-dom'

import { DomainErrorContext, useDomainErrors } from '../shared/errorHandling'
import sessionServiceFactory from '../shared/sessionService'
import { PlasticColorsProvider } from '../shared/plasticColors'
import { ComboDispatchContext } from '../state'
import { useFetch } from '../useFetch'

import { useEdit, EditPromptProvider } from './Edit'
import { useSessionContext, SessionContext } from './useSessionContext'
import { useSession } from './queries'
import { useRealTimeSession } from './useRealTimeSession'

export const useSessionSecret = () => {
  const context = useSessionContext()

  if (!context) {
    return { setSecret: () => null }
  }

  return { setSecret: context.setSecret }
}
export function SessionProvider({ children, state }) {
  const { sessionId } = useParams()
  const history = useHistory()
  const { fetch } = useFetch()
  const { setError } = useDomainErrors()

  const [secret, setSecret] = useState(
    () =>
      JSON.parse(
        localStorage.getItem('paxmagnifica-ti4companion-sessions') || '{}',
      )[sessionId]?.secret,
  )

  const authorizedFetch = useMemo(() => {
    if (!secret) {
      return fetch
    }

    return (link, options, ...rest) => {
      const modifiedOptions = {
        ...options,
        headers: {
          'x-ti4companion-session-secret': secret,
          ...options?.headers,
        },
      }

      return fetch(link, modifiedOptions, ...rest)
    }
  }, [secret, fetch])

  const sessionService = useMemo(
    () => sessionServiceFactory({ fetch: authorizedFetch }),
    [authorizedFetch],
  )

  const editFeature = useEdit()
  const { setEnableEditDialogOpen } = editFeature
  const originalDomainErrorContext = useContext(DomainErrorContext)
  const setSessionError = useCallback(
    (e) => {
      if (e.domain && e.status === 401) {
        setEnableEditDialogOpen(true)
      }

      setError(e)
    },
    [setError, setEnableEditDialogOpen],
  )

  const { session, queryInfo } = useSession({ sessionId })
  useRealTimeSession({ sessionId })
  const loading = !queryInfo.isFetched

  const pushEvent = useCallback(
    async (action) => {
      const { payload } = action

      try {
        await sessionService.pushEvent(payload.sessionId, {
          type: action.type,
          payload,
        })
      } catch (e) {
        setSessionError(e)
      }
    },
    [setSessionError, sessionService],
  )

  const updateFactionPoints = useCallback(
    async ({ sessionId: targetSessionId, faction, points }) => {
      const payload = { sessionId: targetSessionId, faction, points }
      try {
        await pushEvent({ type: 'VictoryPointsUpdated', payload })
      } catch (e) {
        // empty
      }
    },
    [pushEvent],
  )

  const [showPlasticColors, setShowPlasticColors] = useState(true)
  const togglePlasticColors = useCallback(
    () => setShowPlasticColors((a) => !a),
    [],
  )

  const disableEdit = useCallback(() => {
    const sessions = JSON.parse(
      localStorage.getItem('paxmagnifica-ti4companion-sessions') || '{}',
    )
    if (sessions[sessionId]) {
      sessions[sessionId].secret = null
      const stringified = JSON.stringify(sessions)
      localStorage.setItem('paxmagnifica-ti4companion-sessions', stringified)
    }
    setSecret(null)
    history.replace(history.location.pathname, {})
  }, [sessionId, setSecret, history])

  const contextValue = useMemo(
    () => ({
      session,
      loading: loading || state.objectives.loading,
      editable: Boolean(secret),
      updateFactionPoints,
      sessionService,
      setSecret: (s) => {
        const sessions = JSON.parse(
          localStorage.getItem('paxmagnifica-ti4companion-sessions') || '{}',
        )
        if (!sessions[sessionId]) {
          sessions[sessionId] = { id: sessionId }
        }
        sessions[sessionId].secret = s
        localStorage.setItem(
          'paxmagnifica-ti4companion-sessions',
          JSON.stringify(sessions),
        )
        setSecret(s)
      },
      disableEdit,
      editFeature,
    }),
    [
      editFeature,
      session,
      sessionId,
      secret,
      loading,
      state.objectives.loading,
      updateFactionPoints,
      sessionService,
      setSecret,
      disableEdit,
    ],
  )

  return (
    <DomainErrorContext.Provider
      value={{
        ...originalDomainErrorContext,
        setError: setSessionError,
      }}
    >
      <ComboDispatchContext.Provider value={pushEvent}>
        <PlasticColorsProvider
          hide={!showPlasticColors}
          plasticColors={session?.colors}
          toggle={togglePlasticColors}
        >
          <SessionContext.Provider value={contextValue}>
            {children}
            <EditPromptProvider />
          </SessionContext.Provider>
        </PlasticColorsProvider>
      </ComboDispatchContext.Provider>
    </DomainErrorContext.Provider>
  )
}
