<template>
  <div class="students-container">
    <div v-if="isLoggedIn">
      <div class="add-student-container">
        <label for="student-email" >Add new student:</label><br>
        <input id="student-email" v-model="newStudentEmail" placeholder="Email">
        <button @click="addStudent">+</button>
      </div>
      <br>

      <div class="student-data" v-if="!loading_data">
        <input class="filter-container" v-model="filterString" placeholder="Filter students by email">
        <br><br>
        <table>
          <thead>
          <tr>
            <th>Email</th>
            <th>Actions</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="(student, index) in filteredStudents" :key="index">
            <td>{{ student.EMAIL }}</td>
            <td>
              <i class="fas fa-cog" @click="showPopup = true; selectedStudent = student"></i>
              <div v-if="showPopup && selectedStudent === student" class="popup">
                <button @click="resetPassword(student)">Reset Password</button>
                <button @click="toggleLock(student)">{{ student.can_access ? 'Lock' : 'Unlock' }}</button>
                <i class="fas fa-times" @click="showPopup = false"></i>
              </div>
            </td>
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
      loading_data: true,
      students: [],
      showPopup: false,
      selectedStudent: null,
      newStudentEmail: null,
      filterString: ''
    }
  },
  methods: {
    async fetchStudents() {
      try {
        const response = await axios.get('/sessions/students');
        if(response.status === 200) {
          return response.data;
        } else {
          throw new Error(`Unexpected status code: ${response.status}`);
        }
      } catch (error) {
        console.error('Error fetching students:', error);
        return [];
      }
    },
    async resetPassword(student) {
      console.log('Resetting password for:', student.EMAIL);

      const response = await axios.post(`/sessions/students/${student.EMAIL}/reset-password`);
      if(response.status === 200)
        alert('Password reset successful. ' + response.data.message);
    },
    async toggleLock(student) {
      try {
        console.log(student.can_access ? 'Locking' : 'Unlocking', student.EMAIL);

        const url = '/sessions/students';
        let response;

        if (student.can_access) {
          const config = {
            data: { email: student.EMAIL },
          };
          response = await axios.delete(url, config);
        } else {
          response = await axios.post(url, { email: student.EMAIL });
        }

        if ((student.can_access && [204, 200].includes(response.status)) || (!student.can_access && response.status === 200)) {
          student.can_access = !student.can_access;
          alert(`Student ${student.EMAIL} account is now ${student.can_access ? 'UNLOCKED' : 'LOCKED'}.`)
        }
      } catch (error) {
        console.error('Error toggling access for:', student.EMAIL, error);
        alert('Failed toggling lock.');
      }
    },
    async addStudent() {
      try {
        if (this.newStudentEmail) {
          const response = await axios.post('/sessions/students', { email: this.newStudentEmail });
          // we fetch students to align with backend, just in case it fails to add the student to the database
          this.students = await this.fetchStudents();
          this.newStudentEmail = '';

          alert(response.data.message);
        }
      } catch (error) {
        console.error('Error adding new student:', this.newStudentEmail, error);
        alert('Failed adding student, make sure you are using correct format ...@voco.ee');
      }
    }
  },
  async mounted() {
    await loadScript('https://kit.fontawesome.com/f18c6cb8af.js');

    this.students = await this.fetchStudents();
    this.loading_data = false;
  },
  computed: {
    isLoggedIn() {
      return store.state.auth.isAuthenticated;
    },
    email() {
      return store.state.auth.user?.email;
    },
    filteredStudents() {
      return this.students.filter(student =>
          student.EMAIL.toLowerCase().includes(this.filterString.toLowerCase()));
    },
  }
}
</script>

<style scoped>
.students-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100%;
  color: white;
}

.filter-container {
  width: 100%;
}

input {
  flex-grow: 1; /* Allow input to take available space */
  padding: 10px;
  margin-right: 10px; /* Separate input from button */
  border: 1px solid #ddd;
  border-radius: 5px;
  background-color: #555;
  color: white;
}

table {
  border-collapse: collapse;
  width: 80%;
  max-width: 600px;
}

th, td {
  text-align: left;
  padding: 8px;
  border: 1px solid #ddd;
}

th {
  background-color: #555;
}

tr:nth-child(even) {
  background-color: #444;
}

td:nth-child(2) {
  text-align: center;
}

.fas {
  cursor: pointer;
  color: #ccc;
}

.popup {
  position: absolute;
  background-color: #666;
  border: 1px solid #ddd;
  padding: 10px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  z-index: 10;
}

button {
  background-color: #777;
  color: white;
  border: none;
  padding: 8px 16px;
  margin: 4px 2px;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #888;
}

</style>

