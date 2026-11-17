import { LayoutDashboard, Palette, UserCog } from 'lucide-react'
import { type SidebarData } from '../types'

/** Add your app's pages here; the sidebar and the ⌘K command menu both read this list */
export const sidebarData: SidebarData = {
  navGroups: [
    {
      title: 'General',
      items: [{ title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard }],
    },
    {
      title: 'Settings',
      items: [
        { title: 'Profile', url: '/settings', icon: UserCog },
        { title: 'Appearance', url: '/settings/appearance', icon: Palette },
      ],
    },
  ],
}
