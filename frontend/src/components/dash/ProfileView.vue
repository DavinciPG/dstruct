<template>
  <div class="profile-container">
    <div v-if="isLoggedIn">

    </div>
  </div>
</template>

<script>
import store from "@/store";

export default {
  methods: {
  },
  computed: {
    isLoggedIn() {
      return store.state.auth.isAuthenticated;
    },
    email() {
      return store.state.auth.user?.email;
    }
  }
}
</script>

<style scoped>
.profile-container {

}
</style>
