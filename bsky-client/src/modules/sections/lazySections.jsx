import { lazy } from 'react'

export const SearchViewLazy = lazy(async () => {
  const module = await import('../search/index.js')
  return { default: module.SearchView ?? module.default }
})

export const TimelineLazy = lazy(async () => {
  const module = await import('../timeline/index.js')
  return { default: module.Timeline ?? module.default }
})

export const NotificationsLazy = lazy(async () => {
  const module = await import('../notifications/index.js')
  return { default: module.Notifications ?? module.default }
})

export const SettingsViewLazy = lazy(async () => {
  const module = await import('../settings/index.js')
  return { default: module.SettingsView ?? module.default }
})

export const ProfileViewLazy = lazy(async () => {
  const module = await import('../profile/ProfileView')
  return { default: module.ProfileView ?? module.default }
})

export const ProfileViewerPaneLazy = lazy(async () => {
  const module = await import('../profile/ProfileViewerPane.jsx')
  return { default: module.default }
})

export const HashtagSearchPaneLazy = lazy(async () => {
  const module = await import('../search/HashtagSearchPane.jsx')
  return { default: module.default }
})

export const ChatListViewLazy = lazy(async () => {
  const module = await import('../chat/ChatListView.jsx')
  return { default: module.default }
})

export const ChatConversationPaneLazy = lazy(async () => {
  const module = await import('../chat/ChatConversationPane.jsx')
  return { default: module.default }
})
