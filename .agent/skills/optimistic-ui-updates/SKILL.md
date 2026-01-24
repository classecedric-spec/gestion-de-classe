---
name: Optimistic UI Updates & Fallback Strategy (Local State)
description: Guidelines for implementing instant UI feedback using the verified "Local State Strategy" to avoid race conditions and complex caching.
---

# Optimistic UI Updates: The "Local State Strategy"

This skill outlines the pattern for implementing optimistic UI updates using a **Simple Local State** strategy (`useState`), rather than complex server-cache managers (like React Query auto-refetching). This method has proven to be the most robust against "disappearing item" bugs caused by server race conditions.

## 1. The Core Philosophy

**"Trust, then Verify."**

When a user creates an item, we **trust** their input is valid and display it immediately. We do **NOT** immediately ask the server for the "truth" because the server sits behind a database with latency. If we ask too soon, the server will tell us the item doesn't exist yet, causing the UI to flicker or the item to vanish.

## 2. Implementation Guide

### A. The "Simple Hook" Pattern

Instead of `useQuery`, manage your list with a `useState`.

```typescript
// useMyItems.ts

export const useMyItems = () => {
    // 1. Local State holds the "Truth" for the UI
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);

    // 2. Initial Fetch Only
    const fetchItems = useCallback(async () => {
        setLoading(true);
        try {
            const data = await service.getAll();
            setItems(data);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    // 3. Optimistic Creation
    const handleCreated = (newItem: Item) => {
        // DIRECTLY update local state.
        // Do NOT call fetchItems() here!
        setItems(prev => {
            // Avoid duplicates
            if (prev.find(i => i.id === newItem.id)) return prev;
            // Add and sort if needed
            return [...prev, newItem].sort((a, b) => a.name.localeCompare(b.name));
        });
    };

    // 4. Optimistic Deletion
    const handleDelete = async (id: string) => {
        // Backup
        const previous = [...items];
        
        // Immediate Update
        setItems(prev => prev.filter(i => i.id !== id));

        try {
            await service.delete(id);
        } catch (err) {
            // Rollback on error
            setItems(previous);
            toast.error("Deletion failed");
        }
    };

    return { items, loading, handleCreated, handleDelete, fetchItems };
};
```

### B. The "Constructor" Pattern (Form Side)

The form submitting the data is responsible for **constructing the final object** to pass back to the parents.

```typescript
// useMyItemForm.ts

const submitForm = async () => {
    try {
        // 1. Persist to DB
        const { id } = await service.create(formData);
        
        // 2. Construct Optimistic Object
        // MIMIC the structure returned by your fetch query.
        const optimisticItem = {
            id: id,
            ...formData,
            created_at: new Date().toISOString(),
            // Mock empty relations if necessary to prevent UI crashes
            Relations: [], 
            Count: 0
        };

        // 3. Pass UP to the parent
        onAdded(optimisticItem); // <--- Key Step
        
        return true;
    } catch (err) {
        // Handle error...
        return false;
    }
}
```

## 3. Top Rules to Avoid "Disappearing Items"

1. **NEVER Refetch Immediately**: Do not call `refetch()` or `invalidateQueries()` immediately after a mutation success. The DB indexing latency will cause you to fetch a stale list.
2. **Trust the Client**: Treat the client-constructed object as valid. It's what the user just typed; it's correct enough for display.
3. **Persist on Refresh**: Since we successfully saved to the DB (step 1 of submit), the data *will* be there on the next page reload. We don't need to force a reload now.
4. **Mock Relations**: If your List UI expects nested objects (e.g., `item.Category.name`), you must construct these manually in your optimistic object:

    ```typescript
    Category: { id: catId, name: catName } // We know 'catName' because the user selected it in the dropdown!
    ```

## 4. Checklist for Applying This Pattern

- [ ] **Hook**: Switch `useQuery` to `useState` + `useEffect`.
- [ ] **Hook**: Remove any automatic `refetch` calls in `handleCreate` / `handleDelete`.
- [ ] **Form**: Ensure `submitForm` returns or callbacks with the **Full Object**, not just an ID or boolean.
- [ ] **Form**: Manually construct nested relation data (names, colors, etc.) from the form selection state.
- [ ] **Parent**: Ensure the parent component's `onAdded` handler accepts the item and calls `setItems(prev => [...prev, item])`.
