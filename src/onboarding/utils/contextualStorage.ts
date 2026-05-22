export const contextualStorage = {
  hasVisited(key: string): boolean {
    return localStorage.getItem(`ctx_visited_${key}`) === 'true';
  },

  markVisited(key: string): void {
    localStorage.setItem(`ctx_visited_${key}`, 'true');
  },

  reset(key: string): void {
    localStorage.removeItem(`ctx_visited_${key}`);
  },
};
