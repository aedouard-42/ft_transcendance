<script lang="ts">

import IChannel from "@/models/IChannel";
import { defineComponent } from 'vue';
import { mapActions} from "vuex";
import { socket, chatSocket } from "@/websocket";
import IDmList from "@/models/IDmList";
import IUser from "@/models/IUser";
import IDmMessage from "@/models/IDmMessage";
import { thisTypeAnnotation } from "@babel/types";

/*
	TODO :

	listen sockets dm?

	block
	PATCH bugs 2FA -> le controller "me" renvoie toujours false sur is2FAenabled
	creer getAllJoinedChannels qui return les channels de l user -louis
	private channel
	invite to game(lina)
	change password channel
	promote
	ban (limited time)
	mute
	kick

	BACK
	change channel password
	kick (limited time)
	gestion de channel prive (front is sending the good DTO)

	- v-if display only available options (don t block if already blocked etc)
	- clickable profile on user -> opens 	OPTIONS PANEL	:	dm, profile page, add to friends, remove from friend block user, unblock user
											ADVANCED PANEL	:	promote/demote/ban/kick/unban
	persistance des messages
*/

enum opts {
	SEND_DM,
	PROFILE,
	ADD_FRIEND,
	DEL_FRIEND,
	BLK_USER,
	UNBLK_USER,
	INVITE,
	BAN,
	MUTE,
	PROMOTE,
	DEMOTE,
	CHANGE_PASSWD
}

export default defineComponent({
	data() {
		return {
			id: Number(localStorage.getItem('id')),
			options:
			[
				{ id: 0, title: 'Send DM' },
				{ id: 1, title: 'profile page' },
				{ id: 2, title: 'add friend' },
				{ id: 3, title: 'remove friend' },
				{ id: 4, title: 'block user' },
				{ id: 5, title: 'unblock user' },
				{ id: 6, title: 'invite to game' },
				{ id: 7, title: 'ban'},
				{ id: 8, title: 'mute'},
				{ id: 9, title: 'promote'},
				{ id: 10, title: 'demote'},
				{ id: 11, title: 'change password'}
			],
			dialog: false,
			allchans_dialog: false,
			password_dialog: false,
			newChannel: {
				name: '',
				password: '',
				id: 0,
			},
			newJoinRequest:
			{
				channelName : '',
				password : '',
			},
			newMessage: '',
			chatSocket: chatSocket,
			avatar: this.$store.state.chat.avatars_list,
			password: ""
		}
	},
	methods: {
		...mapActions(
			["selectChannel", "rmChannel", "receiveMessage", "joinChannel", "receiveDM",
			"stopReceiving", "getUserChannels", "getAllChannelsStore", "updateChannelsStore"],),
		createPublicChannel(newChan : any)
		{
			const channel_dto = {
				name: newChan.name,
				adminId: this.id,
				password: newChan.password
			};
			this.chatSocket.emit('create', channel_dto);
			chatSocket.
			once('newChannel', (response: any) => {
				this.$store.dispatch('createChannel', response);
			})
			this.dialog = false;
		},
		async selectChannel(channel: IChannel | IDmList) {
			await this.$store.dispatch('selectChannel', channel)
			// this.$store.state.current_channel = channel;
			// if (this.isChannel(channel))
			// chatSocket.emit('getmsg', {
			// 	id: channel.id,
			// 	page: 0
			// })
			// this.current_channel = channel;
		},
		getAllChannels()
		{
			this.getAllChannelsStore();
			chatSocket.emit('getAll');
			this.allchans_dialog = true;
		},
		sendMessage(newMessage: string)
		{
			if (!this.current_channel)
				return
			if (!this.isChannel(this.current_channel))
			{
				const send = {
					message: newMessage,
					id1: this.id,
					id2: this.current_channel.friend.id
				}
				this.chatSocket.emit('sendDM', send)
			}
			else {
				const message_dto = {
					message : newMessage,
					channelId : this.current_channel.id,
					senderId : this.id,
				};
				this.chatSocket.emit('newmsg' , message_dto);
			}
			this.newMessage = '';
		},

		async startReceivingMessages() {
			await this.receiveMessage();
		},
		async startReceivingDMs() {
			await this.receiveDM();
		},
		async stopReceivingMessages()
		{
			await this.stopReceiving();
		},
		async updateChannels(channel : any)
		{
			await this.updateChannelsStore(channel);
		},
		joinChannel(channel : any, password : string)
		{
			const join_dto = {chanId: channel.id, uid: this.id, password : password};
			this.chatSocket.emit('join', join_dto);
		},
		leaveChannel(id : any)
		{
			const leave_dto = {chanId: id, uid: this.id, password : ''};
			this.chatSocket.emit('leave', leave_dto);
		},
		async handleChatUsers(item: any, user: IUser) {
			switch(item.id) {
				case opts.SEND_DM: {
					this.$store.commit("createDMList", {
						me: this.user,
						friend: user,
						messages: [],
						users: [this.user, user]
					})
					this.chatSocket.emit('sendDM', {id1: this.id, id2: user.id, message : this.newMessage});
					break
				}
				case opts.PROFILE: {
					this.$router.push('/profile/' + user.id)
					break
				}
				 case opts.ADD_FRIEND: {
					await this.$store.dispatch('addFriend', user.id)
				 	break
				 }
				 case opts.DEL_FRIEND: {
				 	this.$store.dispatch('deleteFriend', user.id)
				 	break
				 }
				 case opts.BLK_USER: {
				 	this.$store.dispatch('block', user.id)
				 	break
				 }
				 case opts.UNBLK_USER: {
				 	this.$store.dispatch('unblock', user.id)
				 	break
				 }
				 case opts.BAN: {
					if (this.isChannel(this.current_channel))
						this.$store.dispatch('ban', {
						chanId: this.current_channel.id,
						uid: user.id,
						isBan: true,
						date: new Date(2023, 12)
					})

					break
				 }
				 case opts.MUTE: {

					break
				 }
				 case opts.PROMOTE: {

					break
				 }
				 case opts.DEMOTE: {

					break
				 }
				 case opts.INVITE: {
					socket.emit('sendInvitation', user.id)
					break
				 }
				 case opts.CHANGE_PASSWD: {
					this.password_dialog = true
					break
				 }
			}
		},
		updateCurrentChannel(user : any)
		{
			if (this.isChannel(this.current_channel)) {
				this.current_channel.users.push(user);
				this.$store.dispatch('getChatPic', user.username)
			}
		},
		isChannel(item: IChannel | IDmList) : item is IChannel {
			return ((item as IChannel).name ? true : false)
		},
		filterOptions(options: any[], target: IUser) : any[] {
			const out: any[] = [options[opts.PROFILE]];
			if (target.id !== Number(localStorage.getItem('id'))) {
				out.push(options[opts.INVITE])
				if (!this.mapBlockedUser.has(target.id))
					out.push(this.friends.find(f => f.id == target.id) ? options[opts.DEL_FRIEND] : options[opts.ADD_FRIEND]);
				out.push(this.mapBlockedUser.has(target.id) ? options[opts.UNBLK_USER] : options[opts.BLK_USER]);
				if (this.isChannel(this.current_channel)) {
					out.push(options[opts.SEND_DM]);
				}
			}
			if (this.isChannel(this.current_channel)) {
				// out.push(options[opts.SEND_DM]);
				if (this.current_channel.mods.findIndex(mod => mod.id == Number(localStorage.getItem('id'))) != -1)
				{
					if (target.id === Number(localStorage.getItem('id')))
						out.push(options[opts.CHANGE_PASSWD])
					// out.push([
					// 	options[opts.BAN],
					// 	options[opts.MUTE],
					// 	options[opts.PROMOTE],
					// 	options[opts.DEMOTE]
					// ])
				}
			}
			return out;
		},
		rmUserInChannel(channel : IChannel , uid : number)
		{
			const channel_leave = (this.$store.state.chat.joined_channels as IChannel[]).find(chan => chan.id = channel.id);
			if (!channel_leave) return;
			channel_leave.users = channel.users;
			channel_leave.mods = channel.mods;
		},
		changePassword() {
			if(this.isChannel(this.current_channel)) {
				chatSocket.emit('editpw', {
					id: this.current_channel.id,
					newPw: this.password
				})
			}
			this.password_dialog = false
		},
		resetPassword() {
			this.password = ""
			this.changePassword()
		}
	},
    computed: {
		user() : IUser {return this.$store.state.userInfos},
		username() {return this.$store.state.userInfos.username},
		channels() {return this.$store.state.chat.channels},
		joined_channels() {
			return this.$store.state.chat.joined_channels},
		friends() : IUser[] {return this.$store.state.userInfos.friends},
		dms_list() {return this.$store.state.chat.dms_list},
		current_channel() : IChannel | IDmList {return this.$store.state.chat.current_channel},
		blocked_users() : IUser[] {return this.$store.state.chat.blocked_users},
		mapBlockedUser() : Set<number> {return this.$store.state.blockedUser},
		available_channels() {return this.$store.state.chat.available_channels},
		mergedChannels() {return this.$store.state.chat.dms_list.concat(this.$store.state.chat.joined_channels)}
	},
	async mounted() {
		await this.$store.dispatch('getUserInfos')
		this.startReceivingMessages();
		this.startReceivingDMs();
		chatSocket.on('sendAllChannels', (channels : IChannel[]) => {
			const res: any = []
			for (const chan of channels) {
				const index = this.$store.state.chat.joined_channels.findIndex((element: any) => element.id === chan.id)
				if (index === -1)
					res.push(chan)
			}
			this.$store.state.chat.available_channels = res
		})
		chatSocket.on('joined_channel', (res : any ) => {
			if (res.user.id == this.id)
			{
				this.updateChannels(res.channel);
			}
			else
			{
				this.updateCurrentChannel(res.user);
			}

		})
		chatSocket.on('left_channel' , (res: any) => {
			if (res.uid == this.id)
				this.rmChannel(res.channel.id);
			else
				this.rmUserInChannel( res.channel , res.uid)
		})
		chatSocket.on('banned', (res:any) => {
			if (res.uid == this.id)
				this.rmChannel(res.channel.id);
		})
		chatSocket.on('mod', (res: IChannel) => {
		})
		chatSocket.on('deleteChannel', (res: IChannel) => {
			this.rmChannel(res.id);
		})
		chatSocket.on('error', args => {
		})
	},
	async unmounted() {
		await this.$store.dispatch('clearJoinnedChannel')
  		this.stopReceivingMessages();
		chatSocket.off('sendAllChannels');
		chatSocket.off('joined_channel');
		chatSocket.off('left_channel');
		chatSocket.off('error');
		chatSocket.off('deleteChannel')
		chatSocket.off('mod')
		chatSocket.off('banned')
		chatSocket.off('message')
		chatSocket.off('initChannelMessages')
	},
})

</script>

<template>
	<v-container>
	<!-- Users -->
		<v-row id="MainRow">
			<v-col class="Column" align="center" width="100%">
				<v-card id="CardContent">
					<v-card-title class="CardTitle">
						Users
					</v-card-title>
					<ul v-if="current_channel">
						<li>
							<v-list-item v-if="isChannel(current_channel)" v-for="user in current_channel.users">
								<v-card id="Usercard" class="d-flex align-center justify-center mt-4">
										<v-avatar size="60">
											<img
											:src="avatar.get(user.username)"
											alt="John"
											height="60"
											>
										</v-avatar>
									<v-card-text>
										{{user.username}}
										<v-menu activator="parent">
											<v-list id="LighterCard">
												<v-list-item v-for="(item, index) in filterOptions(options, user)" :key="index" :value="index" @click="handleChatUsers(item, user)">
													<v-list-item-title>
														{{ item.title }}
													</v-list-item-title>
												</v-list-item>
											</v-list>
										</v-menu>
									</v-card-text>
								</v-card>
							</v-list-item>
							<v-list-item v-if="!isChannel(current_channel)">
								<v-card id="Usercard" class="d-flex align-center justify-center mt-4">
										<v-avatar size="60">
											<img
											:src="avatar.get(current_channel.friend.username)"
											alt="John"
											height="60"
											>
										</v-avatar>
									<v-card-text>
										{{current_channel.friend.username}}
										<v-menu activator="parent">
											<v-list id="LighterCard">
												<v-list-item v-for="(item, index) in filterOptions(options, user)" :key="index" :value="index" @click="handleChatUsers(item, user)">
													<v-list-item-title>
														{{ item.title }}
													</v-list-item-title>
												</v-list-item>
											</v-list>
										</v-menu>
									</v-card-text>
								</v-card>
							</v-list-item>
						</li>
					</ul>
				</v-card>
			</v-col>

			<!-- Messages -->
			<v-col id="ChatColumn">
				<v-card id="Messagebox" width="100%">
					<v-card-title class="CardTitle" id="ChanTitle" v-if="current_channel != null">
						{{isChannel(current_channel) ? current_channel.name : current_channel.friend.username}}
					</v-card-title>
					<v-card-text class="Messagesscroller" height="100%" align="left">
						<ul v-if="current_channel">
							<div v-for="message in current_channel.messages">
								<li id="messContent" v-if="message.content != ''">
									<span id="username">{{message.sender.username }}</span>:
									<span v-if="mapBlockedUser.has(message.sender.id)" class="font-italic">blocked message</span>
									<span v-else>{{ message.content }}</span>
								</li>
							</div>
						</ul>
					</v-card-text>
				</v-card>
				<v-row justify="center">
					<v-card id="Inputbox" class="d-flex" elevation="8">
						<v-text-field v-model="newMessage" v-on:keydown.enter="sendMessage(newMessage)" hide-details density="compact" id="Inputfield" autofocus>
						</v-text-field>
						<v-card-actions>
							<v-btn id="Btnsend"
							@click="sendMessage(newMessage)"
							>
								Send
							</v-btn>
						</v-card-actions>
					</v-card>
				</v-row>
			</v-col>

			<!-- Channels -->
			<v-col class="Column" align="center" width="100%">
				<v-card id="CardContent" v-if="joined_channels">
					<v-card-title class ="CardTitle">
						channels
					</v-card-title>
					<v-card id="Channelcreate" class="justify-center">
						<v-btn id="Btnchannel" class="mt-2 mr-4 mb-2" @click="dialog = true">
							<p class="alttxt">
								Add
							</p>
							<img class="alticon" src="@/assets/addchan.png" />
						</v-btn>
						<v-dialog v-model="dialog" max-width="500px">
						<v-card id="Dialogbox">
							<v-card-title>
								Create a New Channel
							</v-card-title>
							<v-card-text>
								<v-text-field label="Channel Name" v-model="newChannel.name"></v-text-field>
								<v-text-field label="Password" v-model="newChannel.password"></v-text-field>
							</v-card-text>
							<v-card-actions>
							<v-spacer/>
								<v-btn color="error" text @click="dialog = false">Cancel</v-btn>
								<v-btn color="primary" @click="createPublicChannel(newChannel)">Create</v-btn>
							</v-card-actions>
						</v-card>
						</v-dialog>
						<v-btn id="Btnchannel" class="mt-2 mb-2"
							@click="getAllChannels"
						>
							<p class="alttxt">
								Search
							</p>
							<img class="alticon" src="@/assets/quest.png" />
						</v-btn>
						<v-dialog v-model="password_dialog" max-width="500">
							<v-card>
								<v-cars-title class="ChanlistTitle text-center">
									Change password
								</v-cars-title>
								<v-list-item>
									<v-form @submit.prevent="changePassword">
										<v-text-field
											label="new password"
											type="password"
											v-model="password">
										</v-text-field>
										<v-btn color="primary" type="submit" class="my-2">Submit</v-btn>
										<v-btn
											color="error"
											class="my-2 ml-4"
											variant="text"
											@click="resetPassword"
										>
										Reset
										</v-btn>
									</v-form>
								</v-list-item>
							</v-card>
						</v-dialog>
						<v-dialog v-model="allchans_dialog" max-width="500">
						<v-card id="Dialogbox">
							<v-card-title class="ChanlistTitle text-center">
								Channels list
							</v-card-title>
							<v-list-item v-for="channel in available_channels" :key="channel.id">
								<v-card
								id="LighterCard"
								class="d-flex flex-column align-center justify-center mt-4 mx-4 pa-4"
								height="auto"
								elevation="2"
								>
								<div class="d-flex align-center justify-center mb-2">
									<span class="font-weight-bold">{{channel.name}}</span>
								</div>
								<div class="d-flex align-center justify-center mb-2">
									<div class="d-flex align-center justify-center">
										<v-text-field v-model="newJoinRequest.password"
										class="mx-2"
										label="Password"
										type="password"
										single-line
										dense
										hide-details
										outlined
										style="width: 150px;"
										></v-text-field>
									</div>
									<v-btn color="primary" class="mr-2" @click="joinChannel(channel , newJoinRequest.password)">
										Join
									</v-btn>
									</div>
								</v-card>
							</v-list-item>
							</v-card>
						</v-dialog>
					</v-card>
					<v-card id="ChanContent" v-if="joined_channels || dms_list">
						
						<v-list-item v-for="chat, index in mergedChannels" :key="index">
							<v-card
								id="Channelcard"
								class="d-flex align-center justify-center mt-4"
								height="5vh"
								@click="selectChannel(chat)"
								v-bind:class="{
									'highlight': current_channel && isChannel(current_channel) && current_channel.id == chat.id,
									'DMhighlight': current_channel && !isChannel(current_channel) && current_channel.friend.id == chat.id}"
								>
								{{chat.name ? chat.name : chat.friend.username}}
							</v-card>
						</v-list-item>
					</v-card>
					<v-card id="Channelactions">
						<v-card-actions class="justify-center" v-if="current_channel && isChannel(current_channel)">
							<v-btn
								class="altbtn"
								id="Btnchannel"
								@click="leaveChannel(isChannel(current_channel) ? current_channel.id : -1)"
								
							>
								<p class="alttxt">
								leave channel
								</p>
								<img class="alticon" src="@/assets/sign-out.png" />
							</v-btn>
						</v-card-actions>
					</v-card>
				</v-card>
			</v-col>
		</v-row>
	</v-container>
</template>

<style scoped>
.v-container {
	max-width: 			none;
	padding:			0px;
	display:			flex;
}

.ChanlistTitle {
	font-family: 		"pokemon"!important;
	color:				rgb(255, 200, 0);
	text-shadow:		0px 0px 3px rgb(5, 6, 105);
	font-size:			2em;
	letter-spacing: 	2px;
	padding-top: 20px;
	padding-bottom: 0px;
}

</style>

<style>

#MainRow {
	margin-top:			3%!important;
	margin-left:		5%!important;
	margin-bottom:		3%;
	margin-right:		5%;
	display:			flex;
	flex-direction:		row;
	gap: 				3%;
	flex-grow:			1;
	flex-basis:			0;
}

.Column {
	flex-grow:			1;
	overflow: 			hidden!important;
}

#ChatColumn {
	display:			flex;
	flex-direction:		column;
	gap:				20px;
	flex-grow:			5;
	overflow: 			hidden!important;
}

#ChanContent {
	background-color:	transparent;
	box-shadow:			none;
}

#CardContent
{
	background:			linear-gradient(0deg, rgba(140, 0, 255, 0.479) 0%, rgb(32, 32, 134) 7%, rgb(29 25 94) 13%, rgb(26 26 122 / 93%) 35%, rgb(55 53 155 / 71%) 100%);
	overflow:			auto;
	display:			flex;
	flex-direction:		column;
	backdrop-filter: 	blur(4px);
	height:				100%;
	border-bottom:		solid 6px rgba(218, 154, 255, 0.74);
	border-radius:		22px 22px 10px 10px;
}

#Usercard
{
	background-color:	rgb(55 53 155 / 71%);
	color:				rgb(255, 200, 0);
}

.CardTitle
{
	font-family:		"Pokemon";
	height:				35px!important;
	min-height:			35px!important;
	flex-shrink: 0;
	/* flex-grow: 1; */
	flex-basis: 0;
	letter-spacing:		1.5px!important;
	color:				#ffae00;
	text-shadow:		0px 0px 3px rgb(5, 6, 105);
	background:			linear-gradient(180deg, rgb(29 25 94) 0%, rgb(30, 30, 126) 30%, rgba(55, 53, 155, 0) 100%);
}

#ChanTitle {
	text-align:			center;
	height:				35px!important;
	min-height:			35px!important;
}

#Dialogbox
{
	background:			linear-gradient(0deg, rgb(33, 0, 87) 0%, rgba(55, 26, 122, 0.93) 35%, rgba(55, 43, 170, 0.555) 100%);
	backdrop-filter: 	blur(6px);
	border-radius:		10px 10px 10px 10px;
	border-bottom:		solid 6px rgba(151, 88, 187, 0.74);
	overflow:			auto!important;
	font-family:		"pixel";
	color:				rgb(212, 211, 221);
}

.Messagesscroller {
	flex-direction:		column-reverse!important;
	flex-grow:			1;
	flex-basis:			0!important;
	padding-left:		20px!important;
	display:			flex;
	overflow-x:			auto;
	overflow-y: hidden;
}

#Messagebox
{
	background:			linear-gradient(0deg, rgb(29 25 94) 0%, rgb(26 26 122 / 93%) 35%, rgb(55 53 155 / 71%) 100%);
	backdrop-filter: 	blur(4px);
	border-radius:		22px 22px 10px 10px;
	height:				100%;
	flex-grow:			2;
	display:			flex;
	flex-direction: 	column;
	justify-content:	stretch;
	border-bottom: 		solid 6px white;
	overflow:			hidden!important;
	font-family:		"Pokemon";
	color:				rgb(255, 200, 0);
	text-shadow:		2px 2px 4px rgb(0, 4, 255), 0 0 1em rgb(0, 0, 0), 0 0 0.2em rgb(2, 175, 255);
}

#Inputbox
{
	background:			linear-gradient(180deg, rgb(45, 40, 138) 0%, rgba(70, 68, 167, 0.788) 100%);
	flex-grow: 			1;
	display: 			flex;
	backdrop-filter:	blur(4px);
	border-radius:		10px;
	flex-direction:		row;
	align-items:		center;
	gap : 				5px;
	margin: 12px;
}

#Inputfield
{
	background-color:	rgb(255, 255, 255);
	font-family: 		"pixel";
	letter-spacing: 	0.7px;
	border-radius:		5px;
	flex-grow:			1;
	font-size:			0.7em;
	margin: 12px;
	color:  			black;
}

#Btnsend
{
	background-color:	rgb(0, 0, 128);
	font-family:		"Pokemon";
	width:				60px;
	height:				40px;
	flex-grow:			0;
	flex-basis:			0;
	color:				rgb(255, 200, 0);
	text-shadow:		2px 2px 4px rgb(0, 4, 255), 0 0 1em rgb(0, 0, 0), 0 0 0.2em rgb(2, 175, 255);
}

#Btnchannel
{
	background:			linear-gradient(180deg, rgb(255, 189, 89) 0%, rgb(221, 151, 0) 100%);
	font-family:		"Pokemon";
	color:				rgb(11, 45, 95);
}

#Channelcard
{
    background-color:	rgb(76, 75, 177);
}

#DMcard
{
    background-color: #c73232;
    color: #ffd483;
}

#Channelscontent
{
	background-color:	rgb(0, 0, 128);
	font-family:		"Pokemon";
    color:				#ffce74;
}

#Channelcreate
{
	background-color: 	transparent;
}

#Channelactions
{
	width: 100%;
	background-color:	#16268000;
	position: fixed;
	bottom: 0;
	left: 0;
}

.highlight {
    color:				#ffae00!important;
    background-color:	#1b2c8f!important;
}

.DMhighlight {
    color:				#ffae00!important;
    background-color:	#cc2727!important;
}

.alticon {
	display: 			none;
}

#messContent {
	font-family: 		"pixel";
	font-size: 			10px;
	text-shadow: 		none;
	color: 				rgb(255, 255, 255);
}

#username {
	color: 				rgb(149, 151, 245);
}

@media(max-width: 1477px) {

#Btnchannel {
	padding: 			0px;
	min-width: 			0px!important;
}

.alticon {
	display: 			block;
	padding:			2px;
	width: 				35px!important;
	height: 			35px!important;
}

.alticon:hover {
	filter: brightness(1.4);
}

.alttxt {
	display: 			none;
}

}

</style>
