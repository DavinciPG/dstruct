<template>
  <div>

  </div>
</template>

<script>
import {mapActions} from "vuex";
import router from "@/router";

export default {
  methods: {
    ...mapActions(['unAuthorize']),
    async logout() {
      await this.$http.delete('/sessions')
          .then(response => {
            if(response.status === 200) { // OK
              this.unAuthorize();
              router.push('/login');
            } else {
              console.error('Unexpected status code: ', response.status);
            }
          })
          .catch(error => {
            console.error('Logout error:', error.message);
          });
    }
  }
}
</script>

<style scoped>

</style>
