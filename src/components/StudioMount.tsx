import { Studio } from 'sanity'
import config from '../../sanity.config'

export default function StudioMount() {
  return <Studio config={config} />
}
