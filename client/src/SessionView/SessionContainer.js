import React, { useMemo, useState, useCallback, useContext } from 'react'
import { useParams, useHistory } from 'react-router-dom'

import {
  DomainErrorContext,
  useDomainErrors,
  handleErrors,
} from '../shared/errorHandling'
import sessionServiceFactory from '../shared/sessionService'
import { PlasticColorsProvider } from '../shared/plasticColors'
import { ComboDispatchContext } from '../state'
import { FetchContext, useFetch } from '../useFetch'
import { useObjectives } from '../queries'
import { VP_SOURCE } from '../shared/constants'
import CONFIG from '../config'

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

export function SessionContainer({ children }) {
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

  const {
    queryInfo: { isFetched: areObjectivesFetched },
  } = useObjectives()
  const { session, queryInfo } = useSession({
    sessionId,
    enabled: areObjectivesFetched,
  })
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

        return true
      } catch (e) {
        setSessionError(e)

        return false
      }
    },
    [setSessionError, sessionService],
  )

  const [pointChangesHistory, setPointChangeHistory] = useState([])
  const updateFactionPoints = useCallback(
    async ({ sessionId: targetSessionId, faction, points }) => {
      const payload = { sessionId: targetSessionId, faction, points }

      const success = await pushEvent({ type: 'VictoryPointsUpdated', payload })
      if (success) {
        setPointChangeHistory((oldHistory) => [
          ...oldHistory,
          { faction, points },
        ])
      }
    },
    [pushEvent],
  )
  const addPointSource = useCallback(
    async ({ index, faction, points: newFactionPoints, source, context }) => {
      try {
        await authorizedFetch(
          `${CONFIG.apiUrl}/api/sessions/${sessionId}/events`,
          {
            method: 'post',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventType: 'AddPointSource',
              serializedPayload: JSON.stringify({
                faction,
                points: newFactionPoints,
                source: VP_SOURCE.fromFrontendToBackend(source),
                context,
              }),
            }),
          },
        ).then(handleErrors)
        setPointChangeHistory((oldHistory) =>
          oldHistory.map((historyPoint, historyIndex) =>
            historyPoint.faction === faction &&
            historyPoint.points === newFactionPoints &&
            index === historyIndex
              ? { ...historyPoint, source, context }
              : historyPoint,
          ),
        )
      } catch (e) {
        console.error(e)
      }
    },
    [authorizedFetch, sessionId],
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
      loading,
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
      pointChangesHistory,
      addPointSource,
    }),
    [
      pointChangesHistory,
      editFeature,
      session,
      sessionId,
      secret,
      loading,
      updateFactionPoints,
      sessionService,
      setSecret,
      disableEdit,
      addPointSource,
    ],
  )

  return (
    <FetchContext.Provider value={{ fetch: authorizedFetch }}>
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
    </FetchContext.Provider>
  )
}
