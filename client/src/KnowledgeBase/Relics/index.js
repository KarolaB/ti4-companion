import { useState, useMemo } from 'react'
import clsx from 'clsx'
import { Grid, CircularProgress } from '@material-ui/core'
import { makeStyles } from '@material-ui/core/styles'
import { useTranslation } from 'react-i18next'

import useSmallViewport from '../../shared/useSmallViewport'
import DebouncedTextField from '../../shared/DebouncedTextField'
import Relic from '../../shared/Relic'

import { useRelics } from './queries'

function RelicsProvider(props) {
  const { relics, queryInfo } = useRelics()

  if (!queryInfo.isFetched) {
    return <CircularProgress color="secondary" />
  }

  return <Relics availableRelics={relics} {...props} />
}

const useStyles = makeStyles((theme) => ({
  grid: {
    margin: '0 auto',
  },
  filtering: {
    marginLeft: theme.spacing(1),
  },
  hide: {
    visibility: 'hidden',
  },
}))

function Relics({ availableRelics }) {
  const classes = useStyles()
  const smallViewport = useSmallViewport()
  const { t } = useTranslation()

  const [searchValue, setSearchValue] = useState('')
  const [filtering, setFiltering] = useState(false)

  const filtered = useMemo(() => {
    const withMeta = Object.values(availableRelics).map((availableRelic) => ({
      ...availableRelic,
      title: t(`relics.${availableRelic.slug}.title`),
      effect: t(`relics.${availableRelic.slug}.effect`),
    }))

    return withMeta.filter(
      (obj) =>
        obj.title.toLowerCase().includes(searchValue.toLowerCase()) ||
        obj.effect.toLowerCase().includes(searchValue.toLowerCase()),
    )
  }, [availableRelics, searchValue, t])

  return (
    <Grid
      className={classes.grid}
      container
      justifyContent={smallViewport ? 'center' : 'flex-start'}
      spacing={2}
    >
      <Grid item xs={12}>
        <Grid alignItems="center" container justifyContent="center">
          <DebouncedTextField
            onChange={setSearchValue}
            placeholder={t('general.labels.search')}
            setLoading={setFiltering}
          />
          <CircularProgress
            className={clsx(classes.filtering, { [classes.hide]: !filtering })}
            color="secondary"
            size={18}
          />
        </Grid>
      </Grid>
      {filtered.map((card) => (
        <Grid key={card.slug} item>
          <Relic
            {...card}
            highlight={searchValue.split(' ')}
            small={smallViewport}
          />
        </Grid>
      ))}
    </Grid>
  )
}

export default RelicsProvider
