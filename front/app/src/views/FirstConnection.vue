<template>
    <v-container>
        <v-row>
            <v-col class="d-flex justify-center mt-10" cols="12" id="col">
                <v-row justify="center">
                    <v-dialog v-model="usernameTakenDialog" max-width="300">
                        <v-card>
                            <v-card-title class="text-h5">Error</v-card-title>
                            <v-card-text>
                                The username is already taken. Please choose another.
                            </v-card-text>
                            <v-card-actions>
                            <v-spacer></v-spacer>
                            <v-btn color="primary" text @click="usernameTakenDialog = false">Fermer</v-btn>
                            </v-card-actions>
                        </v-card>
                    </v-dialog>
                    <v-dialog v-model="changeProfilePicDialog" max-width="300">
                        <v-card>
                            <v-card-title class="text-h5">Change profile picture ?</v-card-title>
                            <v-card-text>
                                Would you like to change your profile picture now ?
                            </v-card-text>
                            <v-card-actions>
                                <v-btn color="primary" text @click="redirectToChangeProfilePic">Oui</v-btn>
                                <v-btn color="secondary" text @click="redirectToHome">Non</v-btn>
                            </v-card-actions>
                        </v-card>
                    </v-dialog>
                    <v-card color="rgb(2, 105, 255, 0.5)">
                        <v-col>
                            <p>
                                CHOOSE USERNAME :
                            </p>
                        </v-col>
                        <v-col>
                            <input type="text" v-model="newUsername" v-on:keyup.enter="ok" spellcheck="false">
                        </v-col>
                    </v-card>
                </v-row>
            </v-col>
            <v-col class="d-flex justify-center mt-10" cols="12" id="col">
                <v-row justify="center">
                    <v-btn class="btn" @click="ok" color="rgb(2, 105, 255)">
                        OK
                    </v-btn>
                </v-row>
            </v-col>
        </v-row>
    </v-container>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import store from '@/store';
import { computed } from '@vue/reactivity';

export default defineComponent({
    data() {
        return {
            newUsername: '',
            usernameTakenDialog: false,
            profilePicURL: '',
            changeProfilePicDialog: false
        }
    },
    mounted() {
        this.$store.dispatch('getUserInfos')
        .then((res: any) => {
            if (res.data.username)
                this.$router.push('/')
        },
        (error: any) => {})
    },
    methods: {
        async ok() {
            await this.$store.dispatch('changeUsername', { username: this.newUsername })
            .then((res: any) => {
                if (res.response && res.response.status === 409)
                    this.usernameTakenDialog = true;
                else
                    this.changeProfilePicDialog = true;
            }
            , (error: any) => {
            })
        },
        redirectToChangeProfilePic() {
            this.changeProfilePicDialog = false;
            this.$router.push('/avatar');
        },
        redirectToHome() {
            this.changeProfilePicDialog = false;
            this.$router.push('/');
        }
    }
})
</script>

<style scoped>
@import '~@/assets/fonts/stylesheet.css';

html, body {
  overflow: hidden !important;
}

.btn, p {
  font-family: "pokemon";
  text-shadow: 2px 2px 4px rgb(0, 4, 255), 0 0 1em rgb(0, 0, 0), 0 0 0.2em rgb(2, 175, 255);
  color: rgb(255, 200, 0);
}

.btn {
	justify-self: center;
	align-self: center;
}

.v-row {
	width: 300px!important;
	align-items: center;
	justify-content: center;
}

.btn:hover {
  color: rgb(255, 233, 0);
}

input, textarea {
    background-color: lightgrey;
    font-family: "pokemon";
}

</style>
