import { useEffect, useState } from 'react'
import { MenuRenderer } from './index'
import { useMenuStore } from '../../stores/menuStore'
import type { Menu } from '../../types/menu'

interface MenuViewPageProps {
  slug: string
}

export default function MenuViewPage({ slug }: MenuViewPageProps) {
  const { menus, fetchMenuFromBackend } = useMenuStore()
  const [menu, setMenu] = useState<Menu | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMenu = async () => {
      // Find menu by slug locally first
      const foundMenu = menus.find(m => m.slug === slug)
      
      if (foundMenu) {
        setMenu(foundMenu)
        setLoading(false)
        return
      }

      // Try to fetch from backend using slug as ID (or we could add a slug lookup endpoint)
      // For now, we'll try to fetch as ID if the slug format matches
      const backendMenu = await fetchMenuFromBackend(slug)
      if (backendMenu) {
        setMenu(backendMenu)
      }
      setLoading(false)
    }

    fetchMenu()
  }, [slug, menus, fetchMenuFromBackend])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!menu) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Menu Not Found</h1>
          <p className="text-gray-600">This menu doesn't exist or has been removed.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <MenuRenderer menu={menu} />
    </div>
  )
}
