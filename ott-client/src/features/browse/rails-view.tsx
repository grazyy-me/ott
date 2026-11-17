import { Fragment, type ReactNode } from 'react'
import type { RailKey, RailPageKey, TitleType } from '@/types/catalog'
import { useAppSelector } from '@/app/hooks'
import { RailSection, RailSkeleton } from '@/components/stream/rail-section'
import { selectAuthStatus } from '@/features/auth/auth-slice'
import { useGetRailsQuery } from '@/features/catalog/catalog-api'

/**
 * Every rail of a page (one request), each in the layout that suits it. Personal rails (Continue Watching,
 * Because You Watched) appear when signed in. `interludes` places a band after a given rail.
 */
export function RailsView({
  page,
  type,
  interludes,
}: {
  page: RailPageKey
  type?: TitleType
  interludes?: Partial<Record<RailKey, ReactNode>>
}) {
  const status = useAppSelector(selectAuthStatus)
  // wait for the session check, so the rails aren't fetched twice (signed out, then signed in)
  const checking = status === 'checking'
  const { data, isLoading, isError, refetch } = useGetRailsQuery(
    { page, signedIn: status === 'authenticated' },
    { skip: checking }
  )

  if (checking || isLoading) {
    return (
      <div aria-busy='true' aria-label='Loading'>
        <RailSkeleton />
        <RailSkeleton wide />
        <RailSkeleton />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className='shell py-24 text-center'>
        <p className='text-lg text-foreground/80'>These rows didn’t load.</p>
        <button
          type='button'
          onClick={() => refetch()}
          className='mt-4 inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground'
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <>
      {data.data.rails.map((rail) => (
        <Fragment key={rail.key}>
          <RailSection rail={rail} type={type} />
          {interludes?.[rail.key]}
        </Fragment>
      ))}
    </>
  )
}
