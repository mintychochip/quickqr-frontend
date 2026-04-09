import { ArrowLeft, Edit2, ExternalLink, QrCode, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { MenuRenderer, QRCodeDisplay } from './index'
import { useMenuStore } from '../../stores/menuStore'

interface PreviewPageProps {
  menuId: string
}

export default function PreviewPage({ menuId }: PreviewPageProps) {
  const { menus, loadMenu } = useMenuStore()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const menu = menus.find(m => m.id === menuId) || null

  useEffect(() => {
    const fetchMenu = async () => {
      if (!menu) {
        setLoading(true)
        const loadedMenu = await loadMenu(menuId)
        if (!loadedMenu) {
          setLoadError('Menu not found')
        }
        setLoading(false)
      } else {
        setLoading(false)
      }
    }
    fetchMenu()
  }, [menuId, menu, loadMenu])
  
  const [showQR, setShowQR] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading menu preview...</p>
        </div>
      </div>
    )
  }

  if (!menu || loadError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Menu Not Found</h2>
          <p className="text-gray-600 mb-4">The menu you're looking for doesn't exist.</p>
          <a
            href="/menu-builder"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Go to Menu Builder
          </a>
        </div>
      </div>
    )
  }

  const publicUrl = `${window.location.origin}/menu/${menu.slug}`

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Preview Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <a
                href={`/menu-editor/${menuId}`}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </a>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Preview</h1>
                <p className="text-sm text-gray-500">{menu.name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <a
                href={`/menu-editor/${menuId}`}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                <span className="hidden sm:inline">Edit</span>
              </a>
              
              <button
                onClick={() => setShowQR(true)}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <QrCode className="w-4 h-4" />
                <span className="hidden sm:inline">QR Code</span>
              </button>
              
              <a
                href={`/menu/${menu.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Content */}
      <div className="p-4 sm:p-8">
        <div className="max-w-md mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border-8 border-gray-800">
          {/* Phone Frame Header */}
          <div className="bg-gray-800 h-6 flex items-center justify-center">
            <div className="w-20 h-4 bg-gray-700 rounded-full" />
          </div>
          
          {/* Menu Content */}
          <div className="h-[600px] overflow-y-auto">
            <MenuRenderer menu={menu} />
          </div>
          
          {/* Phone Frame Footer */}
          <div className="bg-gray-800 h-2" />
        </div>
        
        <p className="text-center text-gray-500 mt-4 text-sm">
          Preview shown as it appears on mobile devices
        </p>
      </div>

      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Menu QR Code</h3>
              <button onClick={() => setShowQR(false)} className="p-1 hover:bg-gray-100 rounded">
                <span className="sr-only">Close</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <QRCodeDisplay url={publicUrl} menuName={menu.name} />
          </div>
        </div>
      )}
    </div>
  )
}
