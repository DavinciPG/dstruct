<template>
  <div class="students-container">
    <div v-if="isLoggedIn">
      <div class="student-data" v-if="!loading_data">
        <table>
          <thead>
          <tr>
            <th>Email</th>
            <th>Actions</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="(student, index) in students" :key="index">
            <td>{{ student.EMAIL }}</td>
            <td>
              <i class="fas fa-cog" @click="showPopup = true; selectedStudent = student"></i>
              <div v-if="showPopup && selectedStudent === student" class="popup">
                <button @click="resetPassword(student)">Reset Password</button>
                <button @click="toggleLock(student)">{{ student.can_access ? 'Unlock' : 'Lock' }}</button>
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
      console.log((student.can_access ? 'Unlocking' : 'Locking'), student.EMAIL);
      const response = await (student.can_access ? axios.delete('/sessions/students', { data: { email: student.EMAIL } }) : axios.post('/sessions/students', { email: student.EMAIL }));
      if((student.can_access && response.status === 201) || (!student.can_access && response.status === 200))
        student.can_access = !student.can_access;
    },
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
  }
}
</script>

<style scoped>
.students-container {

}

</style>
