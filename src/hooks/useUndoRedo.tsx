import { useState, useCallback, useRef } from "react";

interface UseUndoRedoOptions<T> {
  maxHistory?: number;
}

export function useUndoRedo<T>(initialState: T, options?: UseUndoRedoOptions<T>) {
  const maxHistory = options?.maxHistory || 50;
  const [state, setState] = useState<T>(initialState);
  const history = useRef<T[]>([initialState]);
  const historyIndex = useRef(0);
  const isUndoRedoAction = useRef(false);

  const set = useCallback((newState: T | ((prev: T) => T)) => {
    const resolvedState = typeof newState === "function" 
      ? (newState as (prev: T) => T)(state) 
      : newState;

    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      setState(resolvedState);
      return;
    }

    // Truncate history after current index
    history.current = history.current.slice(0, historyIndex.current + 1);
    
    // Add new state
    history.current.push(resolvedState);
    
    // Limit history size
    if (history.current.length > maxHistory) {
      history.current = history.current.slice(-maxHistory);
    }
    
    historyIndex.current = history.current.length - 1;
    setState(resolvedState);
  }, [state, maxHistory]);

  const undo = useCallback(() => {
    if (historyIndex.current > 0) {
      historyIndex.current--;
      isUndoRedoAction.current = true;
      setState(history.current[historyIndex.current]);
      return true;
    }
    return false;
  }, []);

  const redo = useCallback(() => {
    if (historyIndex.current < history.current.length - 1) {
      historyIndex.current++;
      isUndoRedoAction.current = true;
      setState(history.current[historyIndex.current]);
      return true;
    }
    return false;
  }, []);

  const canUndo = historyIndex.current > 0;
  const canRedo = historyIndex.current < history.current.length - 1;

  const reset = useCallback((newState: T) => {
    history.current = [newState];
    historyIndex.current = 0;
    setState(newState);
  }, []);

  return {
    state,
    set,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
    historyLength: history.current.length,
    currentIndex: historyIndex.current,
  };
}
