import { useState } from 'react'
import { X, Plus, Trash2, ArrowRight } from 'lucide-react'
import type { ParsedMenu, ParsedMenuItem } from '../../types/menu'

interface ManualEntryModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (menu: ParsedMenu) => void
}

export default function ManualEntryModal({ isOpen, onClose, onSubmit }: ManualEntryModalProps) {
  const [menuName, setMenuName] = useState('')
  const [items, setItems] = useState<ParsedMenuItem[]>([
    { name: '', price: undefined, description: '', category: 'Menu Items' }
  ])
  const [categories, setCategories] = useState<string[]>(['Menu Items'])

  if (!isOpen) return null

  const addItem = () => {
    setItems([...items, { name: '', price: undefined, description: '', category: categories[0] }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index: number, field: keyof ParsedMenuItem, value: string | number | undefined) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const handleCategoryChange = (index: number, newCategory: string) => {
    updateItem(index, 'category', newCategory)
    if (!categories.includes(newCategory)) {
      setCategories([...categories, newCategory])
    }
  }

  const handleSubmit = () => {
    const validItems = items.filter(item => item.name.trim())
    if (validItems.length === 0) return

    // Extract unique categories from items
    const itemCategories = [...new Set(validItems.map(item => item.category || 'Menu Items'))]

    onSubmit({
      name: menuName.trim() || 'Untitled Menu',
      items: validItems,
      categories: itemCategories,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Enter Menu Manually</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <p className="text-gray-600 mt-1">
            Add your menu items manually without OCR.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Menu Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Menu Name
            </label>
            <input
              type="text"
              value={menuName}
              onChange={(e) => setMenuName(e.target.value)}
              placeholder="e.g., Joe's Pizza Menu"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Menu Items
              </label>
              <button
                onClick={addItem}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="bg-gray-50 rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      Item {index + 1}
                    </span>
                    {items.length > 1 && (
                      <button
                        onClick={() => removeItem(index)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItem(index, 'name', e.target.value)}
                      placeholder="Item name"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="number"
                      value={item.price || ''}
                      onChange={(e) => updateItem(index, 'price', e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="Price (e.g., 12.99)"
                      step="0.01"
                      min="0"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={item.category || 'Menu Items'}
                      onChange={(e) => handleCategoryChange(index, e.target.value)}
                      placeholder="Category"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      value={item.description || ''}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      placeholder="Description (optional)"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={items.filter(i => i.name.trim()).length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Create Menu
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
