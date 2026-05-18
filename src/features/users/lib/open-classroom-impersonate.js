/**
 * Open a blank tab on user click (must be synchronous with the click handler).
 * @returns {Window | null}
 */
export function createClassroomImpersonateTab() {
  return window.open('', '_blank')
}

/**
 * @param {Window | null | undefined} tab
 * @param {string} classroomUrl
 * @returns {boolean}
 */
export function loadClassroomImpersonateInTab(tab, classroomUrl) {
  const url = typeof classroomUrl === 'string' ? classroomUrl.trim() : ''
  if (!url) {
    closeClassroomImpersonateTab(tab)
    return false
  }
  if (tab && !tab.closed) {
    tab.location.href = url
    try {
      tab.opener = null
    } catch {
      /* ignore */
    }
    return true
  }
  return false
}

/**
 * @param {Window | null | undefined} tab
 */
export function closeClassroomImpersonateTab(tab) {
  if (tab && !tab.closed) tab.close()
}
