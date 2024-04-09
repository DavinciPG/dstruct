<template>
  <div class="login-container">
    <div class="logo-container">
      <span class="logo-text">DStruct</span>
    </div>
      <div class="login-card">
        <form @submit.prevent="handleLogin">
          <div class="field">
            <label for="email">Email</label>
            <input type="email" id="email" v-model="email" required />
            <i class="fas fa-user input-icon"></i>
          </div>
          <div class="field">
            <label for="password">Password</label>
            <input type="password" id="password" v-model="password" required />
            <i class="fas fa-lock input-icon"></i>
          </div>
          <button type="submit" :class="{ 'valid': isFormValid }">Log In</button>
        </form>
      </div>
  </div>
</template>

<script>
import { mapActions } from 'vuex';
import router from "@/router";
import { loadScript } from "vue-plugin-load-script";

export default {
  data() {
    return {
      email: '',
      password: '',
      error: ''
    };
  },
  computed: {
    isFormValid() {
      const regex = /^[a-zA-Z0-9._%+-]+@voco\.ee$/;
      if(!regex.test(this.email))
        return false;

      return this.email && this.password;
    }
  },
  async mounted() {
    await loadScript('https://kit.fontawesome.com/f18c6cb8af.js');
  },
  methods: {
    ...mapActions(['authorize']),
    async handleLogin() {
      try {
        const response = await this.$http.post('/sessions', {
          email: this.email,
          password: this.password
        });

        if (response.status === 202) {
          await this.authorize(response.data.data);
          await router.push('/dashboard');
        }
      } catch (error) {
        await this.setError('Login failed. Please try again.');
        console.error('Login error:', error);
      }
    },
    async setError(message) {
      this.error = message;
      setTimeout(() => {
        this.clearError();
      }, 8000);
    },
    async clearError() {
      this.error = '';
    },
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  flex-direction: column;
  align-items: center;
  height: 100vh;
  background-color: var(--bg);

  -moz-user-select: none;
  -khtml-user-select: none;
  -webkit-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

.logo-container {
  margin-bottom: 20px;
  text-align: center;
}

.logo-text {
  font-size: 36px;
  color: var(--input-text);
}

.login-card {

}

.login-card .field {
  position: relative;
}

.login-card .field input {
  width: 100%;
  background-color: var(--inactive-input);
  color: var(--input-text);
  border-radius: 4px;
  border-style: solid;
  border-color: var(--bg);
  padding-left: 10px;
  height: 40px;
  transition: height 0.1s ease;
}

.login-card .field input:focus {
  background-color: var(--active-input);
  outline: none;
  height: 45px;
}

.login-card .field label {
  color: var(--label);
  padding-left: 4px;
}

.login-card .field .input-icon {
  position: absolute;
  top: 64%;
  right: 10px;
  transform: translateY(-50%);
  color: var(--icons);
}

.login-card button {
  background-color: var(--inactive-input);
  color: #6d6d6d;
  margin-top: 5%;
  border-radius: 7px;
  border-style: solid;
  border-color: var(--bg);
  width: 100%;
  height: 40px;
  transition: background-color 0.6s ease;
}

.login-card button:not(.valid) {
  background-color: var(--inactive-input);
  color: #6d6d6d;
}

.login-card button.valid {
  background-color: var(--button-active);
  color: white;
}

</style>