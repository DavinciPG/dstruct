<template>
  <div class="dashboard-container">
    <div v-if="isLoggedIn">
      <input type="text" v-model="searchText" placeholder="Search..." @input="filterItems">

      <div class="new-item-dropdown" ref="dropdown">
        <button @click="toggleDropdown">+ New</button>
        <div v-if="showDropdown" class="dropdown-menu">
          <button @click="createNewItem('folder')">Folder</button>
          <button @click="createNewItem('pdf')">PDF</button>
          <button @click="createNewItem('docx')">DOCX</button>
        </div>
      </div>

      <button @click="showUploadModal = true">+ Upload</button>

      <div class="table-container">
        <table>
          <thead>
          <tr>
            <th colspan="2">
              <button v-if="currentFolderID" @click="goBack" class="go-back-button">
                <i class="fa fa-arrow-left"></i> Back
              </button>
            </th>
          </tr>
          <tr>
            <th @click="sort('title')">TITLE</th>
            <th @click="sort('category')">CATEGORY / TYPE</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="item in filteredItems" :key="item.ID" @click="handleClick(item)" @dblclick.prevent="handleDoubleClick(item, $event)" @contextmenu.prevent="handleRightClick(item, $event)">
            <td>
              <i :class="{'fa fa-folder': item.type === 'folder', 'fa fa-file': item.type === 'document'}"></i>
              <span v-if="editingId !== item.ID || editingField !== 'title'" @dblclick="enableEditing(item, 'title')">{{ item.title }}</span>
              <input
                  v-show="editingId === item.ID && editingField === 'title'"
                  v-model="editingTitle"
                  :ref="'editTitle' + item.ID"
                  @blur="finishEditing(item, 'title')"
                  @keyup.enter="updateField(item, 'title')"
              >
            </td>
            <td>
              <span v-if="item.type === 'folder' && (editingId !== item.ID || editingField !== 'category')" @dblclick="enableEditing(item, 'category')">{{ item.category || 'N/A' }}</span>
              <input
                  v-show="item.type === 'folder' && editingId === item.ID && editingField === 'category'"
                  v-model="editingCategory"
                  :ref="'editCategory' + item.ID"
                  @blur="finishEditing(item, 'category')"
                  @keyup.enter="updateField(item, 'category')"
              >
              <span v-if="item.type === 'document' && (editingId !== item.ID || editingField !== 'document_type')" @dblclick="enableEditing(item, 'document_type')">{{ item.document_type }}</span>
              <input
                  v-show="item.type === 'document' && editingId === item.ID && editingField === 'document_type'"
                  v-model="editingDocumentType"
                  :ref="'editDocumentType' + item.ID"
                  @blur="finishEditing(item, 'document_type')"
                  @keyup.enter="updateField(item, 'document_type')"
              >
            </td>
          </tr>
          </tbody>
        </table>
      </div>

      <div v-if="showUploadModal" class="modal">
        <div class="modal-content">
          <span class="close" @click="closeUploadModal">&times;</span>
          <h3>Upload New Document</h3>
          <input type="text" v-model="uploadTitle" placeholder="Enter document title">
          <input type="file" @change="handleFileUpload">
          <button @click="submitUpload">Upload</button>
        </div>
      </div>

      <div v-if="showModalCreate" class="modal">
        <div class="modal-content">
          <span class="close" @click="closeCreateModal">&times;</span>
          <h3>Create New {{ createType }}</h3>
          <div v-if="createType === 'folder'">
            <input type="text" v-model="foldertitle" placeholder="Folder Title">
            <input type="text" v-model="foldercategory" placeholder="Folder Category (optional)">
          </div>
          <div v-else>
            <input type="text" v-model="documenttitle" placeholder="Document Title">
          </div>
          <button @click="submitNewItem">Create</button>
        </div>
      </div>

      <div v-if="showModal" class="modal">
        <div class="modal-content">
          <span class="close" @click="closeModal()">&times;</span>
          <h3>Edit {{ selectedItem.type }}: {{ selectedItem.title }}</h3>
          <button @click="deleteItem()">Delete</button>
          <button @click="downloadFile(selectedItem)">Download</button>
          <h3>Share {{ selectedItem.type }}</h3>
          <input type="email" v-model="shareEmail" placeholder="Enter email to share with">
          <div v-if="selectedItem.type === 'document'">
            <label><input type="checkbox" v-model="permissions.read"> Read</label>
            <label><input type="checkbox" v-model="permissions.write"> Write</label>
            <label><input type="checkbox" v-model="permissions.delete"> Delete</label>
          </div>
          <div v-else>
            <label><input type="checkbox" v-model="permissions.read"> Read</label>
            <label><input type="checkbox" v-model="permissions.write"> Write</label>
            <label><input type="checkbox" v-model="permissions.create"> Create</label>
            <label><input type="checkbox" v-model="permissions.delete"> Delete</label>
          </div>
          <button @click="shareItem()">Share</button>

          <table>
            <thead>
            <tr>
              <th>Email</th>
              <th>Read</th>
              <th>Write</th>
              <th>Delete</th>
              <th v-if="selectedItem.type === 'folder'">Create</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="share in sharedWith[selectedItem.ID]" :key="share.User.EMAIL">
              <td>{{ share.User.EMAIL }}</td>
              <td><input type="checkbox" @change="updatePrivilege(share, 'READ_PRIVILEGE')" v-model="share.READ_PRIVILEGE"></td>
              <td><input type="checkbox" @change="updatePrivilege(share, 'WRITE_PRIVILEGE')" v-model="share.WRITE_PRIVILEGE"></td>
              <td><input type="checkbox" @change="updatePrivilege(share, 'DELETE_PRIVILEGE')" v-model="share.DELETE_PRIVILEGE"></td>
              <td v-if="selectedItem.type === 'folder'"><input type="checkbox" @change="updatePrivilege(share, 'CREATE_PRIVILEGE')" v-model="share.CREATE_PRIVILEGE"></td>
            </tr>
            </tbody>
          </table>
        </div>
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
      showModal: false,
      selectedItem: null,
      editingId: null,
      editingField: null,
      editingTitle: '',
      editingCategory: '',
      searchText: '',
      editingDocumentType: '',
      shareEmail: '',
      permissions: {
        read: false,
        write: false,
        create: false, // only for folders
        delete: false
      },
      currentFolderID: null,
      clickTimer: null,
      sharedWith: {},
      showDropdown: false,
      showModalCreate: false,
      createType: null,
      foldertitle: '',
      foldercategory: '',
      documenttitle: '',
      documenttype: '',
      showUploadModal: false,
      uploadTitle: '',
      uploadFile: null,
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
        this.filteredItems = this.items.filter(item => (!item._ID && !item.FOLDER_ID));
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
    handleFolderClick(folder) {
      this.currentFolderID = folder.ID;
      this.updateView();
    },
    updateView() {
      const subfolders = this.items.filter(item => item.type === 'folder' && item._ID === this.currentFolderID);
      const documents = this.items.filter(item => item.type === 'document' && item.FOLDER_ID === this.currentFolderID);

      this.filteredItems = [...subfolders, ...documents];
    },
    filterItems() {
      let lowerSearchText = this.searchText.toLowerCase();
      this.filteredItems = this.items.filter(item =>
          (item.title.toLowerCase().includes(lowerSearchText) ||
              (item.category && item.category.toLowerCase().includes(lowerSearchText))) &&
          (this.currentFolderID ? item._ID === this.currentFolderID : !item._ID)
      );
    },
    closeModal() {
      this.showModal = false;
    },
    deleteItem() {
      if (!confirm(`Are you sure you want to delete this ${this.selectedItem.type}?`)) {
        return;
      }

      axios.delete(`/docs/${this.selectedItem.type}s/${this.selectedItem.ID}`)
          .then(response => {
            console.log('Delete successful:', response);
            this.items = this.items.filter(item => item.ID !== this.selectedItem.ID);
            this.filteredItems = this.filteredItems.filter(item => item.ID !== this.selectedItem.ID);
            this.closeModal();
            this.selectedItem = null;
          })
          .catch(error => {
            console.error('Update failed:', error);
            alert('Failed to delete the item.');
          });
    },
    enableEditing(item, field) {
      this.editingId = item.ID;
      this.editingField = field;
      if (field === 'title') {
        this.editingTitle = item.title;
      } else if (field === 'category') {
        this.editingCategory = item.category || '';
      }
      this.$nextTick(() => {
        const inputRef = this.$refs['edit' + field.charAt(0).toUpperCase() + field.slice(1) + item.ID][0];
        if (inputRef) {
          inputRef.focus();
        }
      });
    },
    updateField(item, field) {
      const oldValue = item[field];
      const newValue = this['editing' + field.charAt(0).toUpperCase() + field.slice(1)];

      if (oldValue !== newValue) {
        item[field] = newValue;
        const endpoint = (item.type === 'folder')
            ? `/docs/folders/${item.ID}`
            : `/docs/documents/${item.ID}`;
        const data = (field === 'title' || field === 'category')
            ? { [field]: newValue }
            : { document_type: newValue };

        axios.post(endpoint, data)
            .then(response => {
              console.log('Update successful:', response);
            })
            .catch(error => {
              console.error('Update failed:', error);
            });
      }

      this.editingId = null;
      this.editingField = null;
    },
    finishEditing() {
      this.editingId = null;
      this.editingField = null;
    },
    shareItem() {
      const data = {
        email: this.shareEmail,
        permissions: this.permissions,
        READ_PRIVILEGE: this.permissions.read,
        WRITE_PRIVILEGE: this.permissions.write,
        DELETE_PRIVILEGE: this.permissions.delete,
        CREATE_PRIVILEGE: this.permissions.create
      };

      const endpoint = `/docs/${this.selectedItem.type}s/${this.selectedItem.ID}/share`;
      axios.put(endpoint, data)
          .then(response => {
            alert('Share successful: ' + response.data.message);
            this.closeModal();
          })
          .catch(error => {
            console.error('Share failed:', error);
            alert('Share failed: ' + error.message);
          });
    },
    goBack() {
      if (!this.currentFolderID) return;

      const parentFolder = this.items.find(item => item.ID === this.currentFolderID && item._ID);
      this.currentFolderID = parentFolder ? parentFolder._ID : null;
      this.updateView();
    },
    handleClick(item) {
      clearTimeout(this.clickTimer);

      this.clickTimer = setTimeout(() => {
        if (item.type === 'folder') {
          this.handleFolderClick(item);
        }
      }, 250);
    },
    handleDoubleClick(item, event) {
      event.preventDefault();
      event.stopImmediatePropagation();

      clearTimeout(this.clickTimer);

      if (item.type === 'folder') {
        this.enableEditing(item, 'title');
      }
    },
    handleRightClick(item, event) {
      this.showModal = true;
      this.selectedItem = { ...item }
      event.stopPropagation();
      this.fetchSharingDetails(item);
    },
    fetchSharingDetails(item) {
      axios.get(`/docs/${item.type}s/${item.ID}/share`)
          .then(response => {
            this.sharedWith[item.ID] = response.data;
            console.log(this.sharedWith[item.ID]);
          })
          .catch(error => {
            console.error("Failed to fetch sharing details:", error);
          });
    },
    toggleDropdown() {
      this.showDropdown = !this.showDropdown;
    },
    createNewItem(type) {
      this.createType = type;
      this.showModalCreate = true;
      this.showDropdown = false;
    },
    submitNewItem() {
      switch (this.createType) {
        case 'folder':
          axios.put('/docs/folders', {
            title: this.foldertitle,
            category: this.foldercategory || null,
            _ID: this.currentFolderID || null
          }).then(response => {
            console.log('Folder created:', response);
            this.fetchItems();
          }).catch(error => {
            console.error('Error creating folder:', error);
          });
          break;
        case 'pdf':
        case 'docx':
          axios.put('/docs/documents', {
            title: this.documenttitle,
            document_type: this.createType,
            FOLDER_ID: this.currentFolderID || null
          }).then(response => {
            console.log('Document created:', response);
            this.fetchItems();
          }).catch(error => {
            console.error('Error creating document:', error);
          });
          break;
      }
      this.closeCreateModal();
    },
    closeCreateModal() {
      this.showModalCreate = false;
      this.foldertitle = '';
      this.foldercategory = '';
      this.documenttitle = '';
      this.documenttype = '';
    },
    handleClickOutside(event) {
      if (this.$refs.dropdown && !this.$refs.dropdown.contains(event.target)) {
        this.showDropdown = false;
      }
    },
    updatePrivilege(share, privilegeType) {
      const payload = {
        email: share.User.EMAIL,
        READ_PRIVILEGE: share.READ_PRIVILEGE,
        WRITE_PRIVILEGE: share.WRITE_PRIVILEGE,
        DELETE_PRIVILEGE: share.DELETE_PRIVILEGE,
        CREATE_PRIVILEGE: share.CREATE_PRIVILEGE || undefined  // Only for folders
      };

      const type = share.document_id === null ? 'folders' : 'documents';
      const id = share.document_id === null ? share.FOLDER_ID : share.document_id;

      axios.put(`/docs/${type}/${id}/share`, payload)
          .then(response => {
            console.log(`Permissions updated for ${payload.email}`, response);
          })
          .catch(error => {
            console.error('Failed to update permissions:', error);
            alert('Failed to update permissions. Please try again.');
            share[privilegeType] = !share[privilegeType];
          });
    },
    handleFileUpload(event) {
      this.uploadFile = event.target.files[0]; // Capture the file from the input
    },
    closeUploadModal() {
      this.showUploadModal = false;
      this.uploadTitle = '';
      this.uploadFile = null;
    },
    submitUpload() {
      if (!this.uploadFile || !this.uploadTitle) {
        alert("Please provide a title and select a file.");
        return;
      }

      const formData = new FormData();
      formData.append('file', this.uploadFile);

      axios.put('/docs/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }).then(response => {
        axios.put('/docs/documents/upload/details', { title: this.uploadTitle, FOLDER_ID: this.currentFolderID || null, generated_file_name: response.data.filename })
            .then( response2 => {
              console.log(response2);
              this.closeUploadModal();
              this.fetchItems();
              alert('Upload successful.');
            }).catch(error => {
          console.error('Error uploading file:', error);
          alert('Failed to upload the document.');
        })
      }).catch(error => {
        console.error('Error uploading file:', error);
        alert('Failed to upload the document.');
      });
    },
    downloadFile(item) {
      const url = `https://dstruct.vocoprojektid.ee/api/docs/documents/${item.ID}/download`;
      window.open(url, '_blank');
    },
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
    document.addEventListener('click', this.handleClickOutside);
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleClickOutside);
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

tr i {
  padding-right: 15px;
}

input[type="text"] {
  margin-bottom: 20px;
  padding: 8px;
  width: calc(100% - 16px);
  box-sizing: border-box;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.7);
  z-index: 1000;
}

.modal-content {
  position: relative;
  width: 90%;
  max-width: 500px;
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.close {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.close:hover {
  color: #000;
}

button {
  background-color: #4CAF50;
  color: white;
  padding: 8px 16px;
  margin: 8px 0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #45a049;
}

input[type="text"], input[type="email"] {
  width: calc(100% - 20px);
  padding: 10px;
  margin-top: 8px;
  margin-bottom: 16px;
  display: inline-block;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}

label {
  display: block;
  text-align: left;
  margin: 10px 0;
}

input[type="checkbox"] {
  margin-right: 10px;
}

.go-back-button {
  background-color: #f2f2f2;
  color: #337ab7;
  border: 1px solid #ccc;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s, color 0.3s;
}

.go-back-button:hover {
  background-color: #e6e6e6;
  color: #23527c;
}

.go-back-button i {
  margin-right: 5px;
}

.new-item-dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-menu {
  position: absolute;
  left: 0;
  background-color: #f9f9f9;
  min-width: 160px;
  box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
  z-index: 100;
  display: block;
}

.dropdown-menu button {
  color: black;
  padding: 12px 16px;
  text-decoration: none;
  display: block;
  width: 100%;
  border: none;
  background: none;
  text-align: left;
}

.dropdown-menu button:hover {
  background-color: #f1f1f1;
}
</style>
