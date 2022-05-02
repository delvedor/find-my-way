function removeDuplicateSlashes (path) {
  // New path to construct if duplicate slashes are detected
  let newPath = ''
  // The first index of the last grouping of 1 or more '/' that was detected.
  let lastGroupStartSlashIndex = -1
  let lastCopyIndex = 0
  for (let i = 0; i < path.length; i++) {
    // If current character is not a '/' ...
    if (path.charCodeAt(i) !== 47) {
      // ... and we just finished a grouping of 2 or more duplicate slashes ...
      if (lastGroupStartSlashIndex !== -1 && i - 1 > lastGroupStartSlashIndex) {
        newPath += path.slice(lastCopyIndex, lastGroupStartSlashIndex + 1)
        lastCopyIndex = i
      }
      // ... also if we're at the last character of the path and are building a new path ...
      if (i === path.length - 1 && lastCopyIndex > 0) {
        newPath += path.slice(lastCopyIndex, i + 1)
      }
      lastGroupStartSlashIndex = -1
    // ... else if current character is a '/' ...
    } else {
      // ... and it's the first of a grouping ...
      if (lastGroupStartSlashIndex === -1) {
        // ... then start tracking its index.
        lastGroupStartSlashIndex = i
      }
      // ... additionally if we're at the last character of the path and are building a new path ...
      if (i === path.length - 1 && (lastCopyIndex > 0 || lastGroupStartSlashIndex !== i)) {
        newPath += path.slice(lastCopyIndex, lastGroupStartSlashIndex + 1)
        lastCopyIndex = i
      }
    }
  }
  return lastCopyIndex > 0 ? newPath : path
}

module.exports = removeDuplicateSlashes
