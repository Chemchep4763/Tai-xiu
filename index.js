const express = require('express');
const http = require('http');
const socketio = require('socket.io');

const app = express();
app.use(express.static('./www'));

const server = http.createServer(app);
const io = socketio(server);

server.listen(process.env.PORT || 3000, () => {
    console.log("Server đang chạy...");
});

class Taixiu {

    constructor(){
        this.idPhien = 0;
        this.timeDatCuoc = 60;
        this.timeChoPhienMoi = 10;

        this.resetGame();
    }

    resetGame(){
        this.soNguoiChonTai = 0;
        this.soNguoiChonXiu = 0;

        this.tongTienDatTai = 0;
        this.tongTienDatXiu = 0;

        this.idChonTai = [];
        this.idChonXiu = [];

        this.time = this.timeDatCuoc;
        this.coTheDatCuoc = true;
    }

    gameStart(){
        this.idPhien++;
        this.resetGame();

        console.log("New game");

        io.emit("gameStart");

        this.loop = setInterval(()=>{
            this.time--;

            io.emit("gameData",{
                idGame:this.idPhien,
                soNguoiChonTai:this.soNguoiChonTai,
                soNguoiChonXiu:this.soNguoiChonXiu,
                tongTienDatTai:this.tongTienDatTai,
                tongTienDatXiu:this.tongTienDatXiu,
                time:this.time
            });

            if(this.time<=0){
                clearInterval(this.loop);
                this.gameOver();
            }

        },1000);
    }

    gameOver(){

        this.coTheDatCuoc=false;
        this.time=this.timeChoPhienMoi;

        const ketQua=this.gameRandomResult();

        io.emit("gameOver",ketQua);

        const winners = ketQua.result==="tai"?this.idChonTai:this.idChonXiu;

        winners.forEach(data=>{
            io.to(data.id).emit("winGame",{
                msg:`Bạn thắng ${data.tien} xu`
            });
        });

        this.loop=setInterval(()=>{
            this.time--;

            io.emit("gameData",{
                idGame:this.idPhien,
                soNguoiChonTai:this.soNguoiChonTai,
                soNguoiChonXiu:this.soNguoiChonXiu,
                tongTienDatTai:this.tongTienDatTai,
                tongTienDatXiu:this.tongTienDatXiu,
                time:this.time
            });

            if(this.time<=0){
                clearInterval(this.loop);
                this.gameStart();
            }

        },1000);

    }

    putMoney(id,cau,tien){

        if(!this.coTheDatCuoc){
            return {
                status:"error",
                error:"Hết thời gian đặt cược"
            };
        }

        if(cau==="tai"){

            this.tongTienDatTai+=tien;

            const user=this.idChonTai.find(x=>x.id===id);

            if(!user){
                this.idChonTai.push({id,cau:"tai",tien});
                this.soNguoiChonTai++;
            }else{
                user.tien+=tien;
            }

        }else{

            this.tongTienDatXiu+=tien;

            const user=this.idChonXiu.find(x=>x.id===id);

            if(!user){
                this.idChonXiu.push({id,cau:"xiu",tien});
                this.soNguoiChonXiu++;
            }else{
                user.tien+=tien;
            }

        }

        return {status:"success"};

    }

    gameRandomResult(){

        const dice1=Math.floor(Math.random()*6)+1;
        const dice2=Math.floor(Math.random()*6)+1;
        const dice3=Math.floor(Math.random()*6)+1;

        const sum=dice1+dice2+dice3;

        return{
            dice1,
            dice2,
            dice3,
            result:sum<=9?"xiu":"tai"
        }

    }

}

const tx=new Taixiu();

io.on("connection",(socket)=>{

    socket.on("pull",(data)=>{

        const msg=tx.putMoney(data.id,data.dice,data.money);

        socket.emit("pull",msg);

    });

});

tx.gameStart(); 
