import { useParams } from 'react-router'
import { TitleDetail } from './title-detail'

/** /title/:slug opened directly (a shared link, a reload): the details as a full page */
export function TitlePage() {
  const { slug = '' } = useParams()
  return <TitleDetail key={slug} slug={slug} variant='page' />
}
