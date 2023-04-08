import {
    MessageBody,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
    WsResponse,
    ConnectedSocket,
    WsException
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import WsUser from 'src/game/interfaces/WsUser.interface';
import { UserService } from './users.service';
import { JwtService } from '@nestjs/jwt';  

@WebSocketGateway({ namespace: 'user' })
export class UsersGateway implements OnGatewayDisconnect, OnGatewayConnection{
    @WebSocketServer()
    server: Server;
    users = new Map<number, string>();
    private logger = new Logger('UserGateway')
    
    constructor(
        private userService: UserService,
        private jwtService: JwtService
    ) {}

    /********************************************************************** *
     *                         Connection
     * 
     * *********************************************************************/

    async handleConnection(@ConnectedSocket() clientSocket: Socket) {
        const payload = clientSocket.handshake.auth
        const user = await this.userService.findOneById(this.jwtService.decode(clientSocket.handshake.auth.token).sub);  
        if (!user) {
            clientSocket.disconnect();
        }
        else {
            this.logger.log(`${user.username} is online`);
            this.users.set(user.id, 'online')
            this.emitStatus(user.id, 'online')
            clientSocket.join('status')
            clientSocket.emit('init', [...this.users])
        }
    }

    handleDisconnect(@ConnectedSocket() clientSocket: Socket) {
        const user = this.jwtService.decode(clientSocket.handshake.auth.token)
        
        if (!this.users.has(user.sub))
            throw WsException;
        this.logger.log('Client disconnected from user gateway');
        this.users.delete(user.sub)
        this.emitStatus(user.sub, 'offline')
        clientSocket.leave('status')
    }

    emitStatus(id: number, status: string) {
        this.server.to('status').emit('updateStatus', {id: id, status: status})
    }
}