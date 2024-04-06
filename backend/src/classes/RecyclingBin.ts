class RecyclingBin {
    addItem(item : any) {
        const expiration = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // + 7 days
        const array = {
            item_id: item.item_id,
            item_deletion_sql
        }
        this.items.set(this.items.size + 1, item);
    }
  
    removeItem(item) {
        const index = this.items.indexOf(item);
        if (index !== -1) {
            this.items.splice(index, 1);
        }
    }
  
    empty() {
         // More efficient way to empty the array
        this.items.length = 0;
    }
  
    getItems() {
        // Return a copy to avoid modifying the original list
        return [...this.items]; 
    }

    /* Map arguments
        1. unique id
        {
            item_id: id for the item, doesnt have to be unique
            deletion_sql: sql upon timeout 
            revert_sql: sql upon revert
            endDate: when timeout should end
        }
    */
    items = new Map<number, { item_id: number, deletion_sql: string, revert_sql: string, endDate: Date}>();
  }