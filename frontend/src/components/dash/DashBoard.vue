<template>
  <div class="dashboard-container">
    <div v-if="isLoggedIn">
      <input type="text" v-model="searchText" placeholder="Search..." @input="filterItems">
      <div class="table-container">
        <table>
          <thead>
          <tr>
            <th @click="sort('title')">TITLE</th>
            <th @click="sort('category')">CATEGORY</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="item in filteredItems" :key="item.id">
            <td><i :class="{'fa fa-folder': item.type === 'folder', 'fa fa-file': item.type === 'document'}"></i> {{ item.title }}</td>
            <td>{{ item.category || '' }}</td>
          </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import store from "@/store";
import { axiosInstance as axios } from "@/plugins/axios";

import { loadScript } from "vue-plugin-load-script";

export default {
  data() {
    return {
      items: [],
      filteredItems: [],
      currentSortField: null,
      currentSortOrder: 'asc',
      searchText: ''
    };
  },
  methods: {
    fetchItems() {
      Promise.all([
        axios.get('/docs/folders'),
        axios.get('/docs/documents')
      ]).then(([foldersResponse, documentsResponse]) => {
        this.items = [
          ...foldersResponse.data.map(folder => ({ ...folder, type: 'folder' })),
          ...documentsResponse.data.map(document => ({ ...document, type: 'document' }))
        ];
        this.filterItems();
      }).catch(error => {
        console.error('Error fetching items:', error);
      });
    },
    sort(field) {
      if (this.currentSortField === field) {
        this.currentSortOrder = this.currentSortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        this.currentSortField = field;
        this.currentSortOrder = 'asc';
      }
      this.filteredItems.sort((a, b) => {
        let valA = a[field] || '';
        let valB = b[field] || '';
        return (valA < valB ? -1 : 1) * (this.currentSortOrder === 'asc' ? 1 : -1);
      });
    },
    filterItems() {
      const lowerSearchText = this.searchText.toLowerCase();
      this.filteredItems = this.items.filter(item =>
          item.title.toLowerCase().includes(lowerSearchText) ||
          (item.category && item.category.toLowerCase().includes(lowerSearchText))
      );
    }
  },
  computed: {
    isLoggedIn() {
      return store.state.auth.isAuthenticated;
    },
    user() {
      return store.state.auth.user;
    }
  },
  async mounted() {
    await loadScript('https://kit.fontawesome.com/f18c6cb8af.js');

    this.fetchItems();
  }
}
</script>

<style scoped>
.dashboard-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

.table-container {
  width: 50vh;
  max-width: 600px;
  overflow-x: auto;
  background: #f8f9fa;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  text-align: left;
  padding: 8px;
  border-bottom: 1px solid #ccc;
}

th {
  background-color: #343a40;
  color: white;
  cursor: pointer;
}

input[type="text"] {
  margin-bottom: 20px;
  padding: 8px;
  width: calc(100% - 16px);
  box-sizing: border-box;
  border: 1px solid #ccc;
  border-radius: 4px;
}
</style>
