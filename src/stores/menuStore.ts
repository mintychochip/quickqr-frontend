import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import type { Menu, MenuCategory, MenuItem, ParsedMenu } from '../types/menu'

interface MenuState {
  menus: Menu[]
  currentMenu: Menu | null
  ocrProgress: {
    status: 'idle' | 'loading' | 'recognizing' | 'complete' | 'error'
    progress: number
    message: string
  }
  parsedData: ParsedMenu | null
  isLoading: boolean
  error: string | null
  
  // Actions
  setMenus: (menus: Menu[]) => void
  addMenu: (menu: Menu, sync?: boolean) => Promise<string>
  updateMenu: (id: string, updates: Partial<Menu>, sync?: boolean) => Promise<void>
  deleteMenu: (id: string) => Promise<void>
  setCurrentMenu: (menu: Menu | null) => void
  setOcrProgress: (progress: MenuState['ocrProgress']) => void
  setParsedData: (data: ParsedMenu | null) => void
  setIsLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  
  // Backend sync actions
  saveMenuToBackend: (menu: Menu) => Promise<{ id: string } | null>
  fetchMenuFromBackend: (id: string) => Promise<Menu | null>
  loadMenu: (id: string) => Promise<Menu | null>
  
  // Category/Item actions
  addCategory: (menuId: string, category: Omit<MenuCategory, 'items'>) => void
  updateCategory: (menuId: string, categoryId: string, updates: Partial<MenuCategory>) => void
  deleteCategory: (menuId: string, categoryId: string) => void
  reorderCategories: (menuId: string, categoryIds: string[]) => void
  
  addItem: (menuId: string, categoryId: string, item: Omit<MenuItem, 'categoryId'>) => void
  updateItem: (menuId: string, itemId: string, updates: Partial<MenuItem>) => void
  deleteItem: (menuId: string, itemId: string) => void
  moveItem: (menuId: string, itemId: string, targetCategoryId: string) => void
}

export const useMenuStore = create<MenuState>()(
  persist(
    (set, get) => ({
      menus: [],
      currentMenu: null,
      ocrProgress: {
        status: 'idle',
        progress: 0,
        message: '',
      },
      parsedData: null,
      isLoading: false,
      error: null,

      setMenus: (menus) => set({ menus }),
      
      setIsLoading: (isLoading) => set({ isLoading }),
      
      setError: (error) => set({ error }),

      saveMenuToBackend: async (menu: Menu) => {
        try {
          if (!supabase) {
            console.error('Supabase not initialized')
            return null
          }

          // Check if menu already exists in backend
          const { data: existingData, error: checkError } = await supabase
            .from('menus')
            .select('id')
            .eq('id', menu.id)
            .maybeSingle()

          if (checkError) {
            console.error('Error checking existing menu:', checkError)
          }

          let result
          if (existingData) {
            // Update existing
            const { data, error } = await supabase
              .from('menus')
              .update({
                name: menu.name,
                description: menu.description,
                categories: menu.categories,
                template: menu.template,
                primary_color: menu.primaryColor,
                logo_url: menu.logoUrl,
                is_published: menu.isPublished,
                slug: menu.slug,
                updated_at: new Date().toISOString(),
              })
              .eq('id', menu.id)
              .select()
              .single()

            if (error) {
              console.error('Error updating menu in backend:', error)
              return null
            }
            result = data
          } else {
            // Insert new
            const { data, error } = await supabase
              .from('menus')
              .insert({
                id: menu.id,
                name: menu.name,
                description: menu.description,
                categories: menu.categories,
                template: menu.template,
                primary_color: menu.primaryColor,
                logo_url: menu.logoUrl,
                is_published: menu.isPublished,
                slug: menu.slug,
                created_at: menu.createdAt,
                updated_at: menu.updatedAt,
              })
              .select()
              .single()

            if (error) {
              console.error('Error saving menu to backend:', error)
              return null
            }
            result = data
          }

          return result ? { id: result.id } : null
        } catch (error) {
          console.error('Error saving menu to backend:', error)
          return null
        }
      },

      fetchMenuFromBackend: async (id: string) => {
        try {
          if (!supabase) {
            console.error('Supabase not initialized')
            return null
          }

          const { data, error } = await supabase
            .from('menus')
            .select('*')
            .eq('id', id)
            .maybeSingle()

          if (error) {
            console.error('Error fetching menu from backend:', error)
            return null
          }

          if (!data) return null

          // Transform backend format to frontend format
          const menu: Menu = {
            id: data.id,
            name: data.name,
            description: data.description,
            categories: data.categories || [],
            template: data.template || 'minimal',
            primaryColor: data.primary_color,
            logoUrl: data.logo_url,
            isPublished: data.is_published || false,
            slug: data.slug,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            publishedAt: data.published_at,
          }

          return menu
        } catch (error) {
          console.error('Error fetching menu from backend:', error)
          return null
        }
      },

      loadMenu: async (id: string) => {
        const { menus, setMenus } = get()

        // Check if menu exists in local store
        const existingMenu = menus.find((m) => m.id === id)
        if (existingMenu) {
          set({ currentMenu: existingMenu })
          return existingMenu
        }

        // Fetch from backend if not found locally
        const menu = await get().fetchMenuFromBackend(id)
        if (menu) {
          setMenus([...menus, menu])
          set({ currentMenu: menu })
          return menu
        }

        return null
      },

      addMenu: async (menu, sync = true) => {
        set((state) => ({
          menus: [...state.menus, menu],
          currentMenu: menu,
        }))

        if (sync) {
          const result = await get().saveMenuToBackend(menu)
          if (result?.id && result.id !== menu.id) {
            // Update menu ID if backend returns a different one
            set((state) => ({
              menus: state.menus.map((m) =>
                m.id === menu.id ? { ...m, id: result.id } : m
              ),
              currentMenu:
                state.currentMenu?.id === menu.id
                  ? { ...state.currentMenu, id: result.id }
                  : state.currentMenu,
            }))
            return result.id
          }
        }

        return menu.id
      },

      updateMenu: async (id, updates, sync = true) => {
        set((state) => ({
          menus: state.menus.map((m) => (m.id === id ? { ...m, ...updates } : m)),
          currentMenu:
            state.currentMenu?.id === id
              ? { ...state.currentMenu, ...updates }
              : state.currentMenu,
        }))

        if (sync) {
          const menu = get().menus.find((m) => m.id === id)
          if (menu) {
            await get().saveMenuToBackend({ ...menu, ...updates })
          }
        }
      },

      deleteMenu: async (id) => {
        // Delete from backend first
        try {
          if (supabase) {
            const { error } = await supabase
              .from('menus')
              .delete()
              .eq('id', id)

            if (error) {
              console.error('Error deleting menu from backend:', error)
            }
          }
        } catch (error) {
          console.error('Error deleting menu from backend:', error)
        }

        // Delete from local state
        set((state) => ({
          menus: state.menus.filter((m) => m.id !== id),
          currentMenu: state.currentMenu?.id === id ? null : state.currentMenu,
        }))
      },

      setCurrentMenu: (menu) => set({ currentMenu: menu }),
      
      setOcrProgress: (ocrProgress) => set({ ocrProgress }),
      
      setParsedData: (parsedData) => set({ parsedData }),

      addCategory: (menuId, category) =>
        set((state) => {
          const menu = state.menus.find((m) => m.id === menuId)
          if (!menu) return state

          const newCategory: MenuCategory = { ...category, items: [] }
          const updatedMenu = {
            ...menu,
            categories: [...menu.categories, newCategory],
            updatedAt: new Date().toISOString(),
          }

          // Sync to backend
          get().saveMenuToBackend(updatedMenu)

          return {
            menus: state.menus.map((m) => (m.id === menuId ? updatedMenu : m)),
            currentMenu:
              state.currentMenu?.id === menuId ? updatedMenu : state.currentMenu,
          }
        }),

      updateCategory: (menuId, categoryId, updates) =>
        set((state) => {
          const menu = state.menus.find((m) => m.id === menuId)
          if (!menu) return state

          const updatedMenu = {
            ...menu,
            categories: menu.categories.map((c) =>
              c.id === categoryId ? { ...c, ...updates } : c
            ),
            updatedAt: new Date().toISOString(),
          }

          // Sync to backend
          get().saveMenuToBackend(updatedMenu)

          return {
            menus: state.menus.map((m) => (m.id === menuId ? updatedMenu : m)),
            currentMenu:
              state.currentMenu?.id === menuId ? updatedMenu : state.currentMenu,
          }
        }),

      deleteCategory: (menuId, categoryId) =>
        set((state) => {
          const menu = state.menus.find((m) => m.id === menuId)
          if (!menu) return state

          const updatedMenu = {
            ...menu,
            categories: menu.categories.filter((c) => c.id !== categoryId),
            updatedAt: new Date().toISOString(),
          }

          // Sync to backend
          get().saveMenuToBackend(updatedMenu)

          return {
            menus: state.menus.map((m) => (m.id === menuId ? updatedMenu : m)),
            currentMenu:
              state.currentMenu?.id === menuId ? updatedMenu : state.currentMenu,
          }
        }),

      reorderCategories: (menuId, categoryIds) =>
        set((state) => {
          const menu = state.menus.find((m) => m.id === menuId)
          if (!menu) return state

          const categoryMap = new Map(menu.categories.map((c) => [c.id, c]))
          const reorderedCategories = categoryIds
            .map((id) => categoryMap.get(id))
            .filter(Boolean) as MenuCategory[]

          const updatedMenu = {
            ...menu,
            categories: reorderedCategories.map((c, i) => ({ ...c, order: i })),
            updatedAt: new Date().toISOString(),
          }

          // Sync to backend
          get().saveMenuToBackend(updatedMenu)

          return {
            menus: state.menus.map((m) => (m.id === menuId ? updatedMenu : m)),
            currentMenu:
              state.currentMenu?.id === menuId ? updatedMenu : state.currentMenu,
          }
        }),

      addItem: (menuId, categoryId, item) =>
        set((state) => {
          const menu = state.menus.find((m) => m.id === menuId)
          if (!menu) return state

          const newItem: MenuItem = { ...item, categoryId }
          const updatedMenu = {
            ...menu,
            categories: menu.categories.map((c) =>
              c.id === categoryId ? { ...c, items: [...c.items, newItem] } : c
            ),
            updatedAt: new Date().toISOString(),
          }

          // Sync to backend
          get().saveMenuToBackend(updatedMenu)

          return {
            menus: state.menus.map((m) => (m.id === menuId ? updatedMenu : m)),
            currentMenu:
              state.currentMenu?.id === menuId ? updatedMenu : state.currentMenu,
          }
        }),

      updateItem: (menuId, itemId, updates) =>
        set((state) => {
          const menu = state.menus.find((m) => m.id === menuId)
          if (!menu) return state

          const updatedMenu = {
            ...menu,
            categories: menu.categories.map((c) => ({
              ...c,
              items: c.items.map((i) =>
                i.id === itemId ? { ...i, ...updates } : i
              ),
            })),
            updatedAt: new Date().toISOString(),
          }

          // Sync to backend
          get().saveMenuToBackend(updatedMenu)

          return {
            menus: state.menus.map((m) => (m.id === menuId ? updatedMenu : m)),
            currentMenu:
              state.currentMenu?.id === menuId ? updatedMenu : state.currentMenu,
          }
        }),

      deleteItem: (menuId, itemId) =>
        set((state) => {
          const menu = state.menus.find((m) => m.id === menuId)
          if (!menu) return state

          const updatedMenu = {
            ...menu,
            categories: menu.categories.map((c) => ({
              ...c,
              items: c.items.filter((i) => i.id !== itemId),
            })),
            updatedAt: new Date().toISOString(),
          }

          // Sync to backend
          get().saveMenuToBackend(updatedMenu)

          return {
            menus: state.menus.map((m) => (m.id === menuId ? updatedMenu : m)),
            currentMenu:
              state.currentMenu?.id === menuId ? updatedMenu : state.currentMenu,
          }
        }),

      moveItem: (menuId, itemId, targetCategoryId) =>
        set((state) => {
          const menu = state.menus.find((m) => m.id === menuId)
          if (!menu) return state

          let itemToMove: MenuItem | null = null
          const categoriesWithoutItem = menu.categories.map((c) => ({
            ...c,
            items: c.items.filter((i) => {
              if (i.id === itemId) {
                itemToMove = i
                return false
              }
              return true
            }),
          }))

          if (!itemToMove) return state

          const updatedCategories = categoriesWithoutItem.map((c) =>
            c.id === targetCategoryId
              ? {
                  ...c,
                  items: [
                    ...c.items,
                    { ...itemToMove!, categoryId: targetCategoryId },
                  ],
                }
              : c
          )

          const updatedMenu = {
            ...menu,
            categories: updatedCategories,
            updatedAt: new Date().toISOString(),
          }

          // Sync to backend
          get().saveMenuToBackend(updatedMenu)

          return {
            menus: state.menus.map((m) => (m.id === menuId ? updatedMenu : m)),
            currentMenu:
              state.currentMenu?.id === menuId ? updatedMenu : state.currentMenu,
          }
        }),
    }),
    {
      name: 'menu-ocr-storage',
      partialize: (state) => ({ menus: state.menus }),
    }
  )
)
