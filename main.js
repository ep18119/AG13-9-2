// phina.js をグローバル領域に展開
//phina.globalize();

//ブロックエディタ情報
var popup;
//ブロックエディタを開く処理
function openEditor (){
  if(!popup || popup.closed){
    popup = window.open('./AG_editor/editor.html', 'mywindow1', 'width=1000, height=900');
  }else{
    popup.focus();
  }
}
//ブロックエディタから情報を受信する
window.addEventListener("message", receiveMessage, false);
function receiveMessage(event){
  // console.log(event.data);
  // 準備中の状態ならプログラムを獲得する
  if(!info.start){
    // プログラム全体
    chara[0].astAll = event.data;
    // 最初に読み取る抽象構文木
    chara[0].getASTRoots(event.data[0]);
    // 準備完了状態を示す
    chara[0].info.condition.label.text = "準備完了";
    info.startButton.fill = "#ffff00"
    //console.log(chara[0].astNow);
  }
}

//画面サイズ
var SCREEN_WIDTH = 1920;
var SCREEN_HEIGHT = 1080;

//box2dレイヤー作成
var layer = Box2dLayer({
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
});
//重力の強さを再設定 約4倍
layer.world.SetGravity(new b2.Vec2(0, 39.8));
//デバッグ描画を非表示
layer.world.m_debugDraw.SetAlpha(0);
layer.world.m_debugDraw.SetFillAlpha(0);

//グループ
const G_Chara1 = -1;
const G_Chara2 = -2;
//カテゴリー
const C_Stage = 0x0001;
const C_Chara = 0x0002;
const C_Body  = 0x0004;
const C_Bullet = 0x0008;
//ステージ描画エレメント
var stage;
//キャラクター描画エレメント
var chara = new Array();
//キャラクターの座標と向きを獲得する処理
function getCharaPosition(n){
  n = n & 1;
  //console.log(n);
  var a;
  //座標と向きを獲得
  try{
    a = {
      x: chara[n].x,
      y: chara[n].y,
      d: chara[n].direction,
    };
  }catch(error){
    //読み取りエラー時は全要素が0のものを返す
    console.log(error);
    a = { x: 0, y: 0, d: 0 };
  }
  return a;
}

//アセット
var ASSETS = {
  image: {
    'P1_head': './Player1_img/head.png',
    'P1_body': './Player1_img/body.png',
    'P1_arm': './Player1_img/arm.png',
    'P1_hand': './Player1_img/hand.png',
    'P1_leg': './Player1_img/leg.png',
    'P1_foot': './Player1_img/foot.png',
    'P1_axe': './Player1_img/ono.png',
    'P1_slash': './Player1_img/slash.png',
    'P1_shock': './Player1_img/shock.png',
    'E_head': './Enemy1_img/Enemy_head.png',
    'E_body': './Enemy1_img/Enemy_body.png',
    'E_hand': './Enemy1_img/Enemy_hand.png',
    'E_arm1': './Enemy1_img/Enemy_arm1.png',
    'E_arm2': './Enemy1_img/Enemy_arm2.png',
    'E_foot': './Enemy1_img/Enemy_foot.png',
    'E_L1': './Enemy1_img/Enemy_Lleg1.png',
    'E_L2': './Enemy1_img/Enemy_Lleg2.png',
    'E_R1': './Enemy1_img/Enemy_Rleg1.png',
    'E_R2': './Enemy1_img/Enemy_Rleg2.png',
    'Frame': './other_img/frame.png', //デバッグ用
    'Shock1': './Enemy1_img/Shock1.png',
    'Shock2': './Enemy1_img/Shock2.png',
    'Stage1': './other_img/stage1.png',
  },
};

//================================================================//

//ステージ描画クラス
phina.define("CreateStage",{
  superClass: 'DisplayElement',
  init: function() {
    this.superInit({
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
      x: 0,
      y: 0,
    });
    this.origin.set(0,0);
    //ステージ情報
    const blockLength = 120; //ブロックの大きさ
    const stageWidth = 16; //横方向のブロック数
    const stageHeight = 9; //縦方向のブロック数
    //描画するブロック情報
    var block0 = ()=>{
      var a = Sprite('Stage1');
      a.width = blockLength;
      a.height = blockLength;
      a.origin.set(0,0);
      a.alpha = 1;
      return a;
    };
    //ブロック描画　壁
    for(var i=1; i<stageHeight-1; i++){
      block0().setPosition(0, blockLength*i).addChildTo(this);
      block0().setPosition(blockLength*(stageWidth-1), blockLength*i).addChildTo(this);
    }
    //ブロック描画　地面
    for(var i=0; i<stageWidth; i++){
      block0().setPosition(blockLength*i, 0).addChildTo(this);
      block0().setPosition(blockLength*i, blockLength*(stageHeight-1)).addChildTo(this);
    }
    //当たり判定詳細
    //スケール
    var scale = blockLength/layer.world._scale;
    //Bodyの定義と実装
    var bodyDef = new b2.BodyDef;
    bodyDef.type = 0; //static
    bodyDef.position.Set(0,0);
    this.body = layer.world.CreateBody(bodyDef);
    //Fixtureの定義と実装
    var fixtureDef = new b2.FixtureDef();
    //共通の情報
    fixtureDef.density = 1; //密度
    fixtureDef.friction = 0; //摩擦係数
    fixtureDef.restitution = 0; //反発係数
    fixtureDef.shape = new b2.PolygonShape(); //形状
    fixtureDef.filter.categoryBits = C_Stage; //カテゴリー値
    fixtureDef.filter.maskBits = 0xffff; //マスク値
    //天井
    fixtureDef.userData = {name: 'Stage_Ceiling'};
    fixtureDef.shape.SetAsEdge( //線形
      new b2.Vec2(scale,scale),
      new b2.Vec2(scale*(stageWidth-1),scale)
    );
    this.body.CreateFixture(fixtureDef); //反映
    //地面
    fixtureDef.userData = {name: 'Stage_Ground'};
    fixtureDef.shape.SetAsEdge(
      new b2.Vec2(scale,scale*(stageHeight-1)),
      new b2.Vec2(scale*(stageWidth-1),scale*(stageHeight-1))
    );
    this.body.CreateFixture(fixtureDef);
    //壁(左)
    fixtureDef.userData = {name: 'Stage_Wall'};
    fixtureDef.shape.SetAsEdge(
      new b2.Vec2(scale,scale),
      new b2.Vec2(scale,scale*(stageHeight-1))
    );
    this.body.CreateFixture(fixtureDef);
    //壁(右)
    fixtureDef.shape.SetAsEdge(
      new b2.Vec2(scale*(stageWidth-1),scale),
      new b2.Vec2(scale*(stageWidth-1),scale*(stageHeight-1))
    );
    this.body.CreateFixture(fixtureDef);
  },
})

//================================================================//

//プレイヤーキャラクター1のアニメーション
//操作対象
phina.define("Player1", {
  superClass: 'DisplayElement',
  init: function(id) {
    //描画時の識別番号
    this.id = id;
    //初期化
    this.superInit();
    //以下4項目の定義は多分無意味
    this.origin.set(0.5,0.5); //基点の位置
    this.setPosition(0,0); //座標
    this.width = 120; //幅
    this.height = 240; //高さ

    //各画像を順次適用
    //左二の腕
    this.L_arm2 = Sprite('P1_arm').addChildTo(this);
    this.L_arm2.origin.set(0.5,0.125);
    //左腕
    this.L_arm1 = Sprite('P1_arm').addChildTo(this);
    this.L_arm1.origin.set(0.5,0.125);
    //左手
    this.L_hand = Sprite('P1_hand').addChildTo(this);
    this.L_hand.origin.set(0.5,0.5);
    //左腿
    this.L_leg2 = Sprite('P1_leg').addChildTo(this);
    this.L_leg2.origin.set(0.5,0);
    //左脚
    this.L_leg1 = Sprite('P1_leg').addChildTo(this);
    this.L_leg1.origin.set(0.5,1);
    //左足
    this.L_foot = Sprite('P1_foot').addChildTo(this);
    this.L_foot.origin.set(0.25,0.5);
    //右腿
    this.R_leg2 = Sprite('P1_leg').addChildTo(this);
    this.R_leg2.origin.set(0.5,0);
    //右脚
    this.R_leg1 = Sprite('P1_leg').addChildTo(this);
    this.R_leg1.origin.set(0.5,1);
    //右足
    this.R_foot = Sprite('P1_foot').addChildTo(this);
    this.R_foot.origin.set(0.25,0.5);
    //胴体
    this.body = Sprite('P1_body').addChildTo(this);
    this.body.origin.set(0.5,0.75);
    //頭
    this.head = Sprite('P1_head').addChildTo(this);
    this.head.origin.set(0.5,1);
    //右二の腕
    this.R_arm2 = Sprite('P1_arm').addChildTo(this);
    this.R_arm2.origin.set(0.5,0.125);
    //右腕
    this.R_arm1 = Sprite('P1_arm').addChildTo(this);
    this.R_arm1.origin.set(0.5,0.125);
    //武器
    this.axe = Sprite('P1_axe').addChildTo(this);
    this.axe.origin.set(0.17,0.26);
    //右手
    this.R_hand = Sprite('P1_hand').addChildTo(this);
    this.R_hand.origin.set(0.5,0.5);
    //非操作時のプログラム
    this.autoProg = '[{"position":{"x":450,"y":100},"ASTne":{"node":{"getBrickType":"EntryBrick","getBrickCommand":"CommandFuncStart","getBrickArgument":{"disp":"n = ","value":"1"},"getBrickTab":0},"bottom":"Nil","right":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandMR","getBrickArgument":{"disp":"","value":""},"getBrickTab":0},"bottom":"Nil","right":{"node":{"getBrickType":"CaseBrick","getBrickCommand":"CommandSP","getBrickArgument":{"disp":"秒待機","value":"0.3"},"getBrickTab":0},"bottom":"Nil","right":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandMDJ","getBrickArgument":{"disp":"","value":""},"getBrickTab":0},"bottom":"Nil","right":{"node":{"getBrickType":"CaseBrick","getBrickCommand":"CommandSO","getBrickArgument":{"disp":"","value":""},"getBrickTab":0},"bottom":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandMS","getBrickArgument":{"disp":"","value":""},"getBrickTab":0},"bottom":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandML","getBrickArgument":{"disp":"","value":""},"getBrickTab":0},"bottom":{"node":{"getBrickType":"CaseBrick","getBrickCommand":"CommandCED","getBrickArgument":{"disp":"","value":""},"getBrickTab":0},"bottom":{"node":{"getBrickType":"TailBrick","getBrickCommand":"CommandAT","getBrickArgument":{"disp":"","value":""},"getBrickTab":0},"bottom":"Nil","right":"Nil"},"right":"Nil"},"right":"Nil"},"right":"Nil"},"right":"Nil"}}}}}},{"position":{"x":450,"y":100},"ASTne":{"node":{"getBrickType":"EntryBrick","getBrickCommand":"CommandFuncStart","getBrickArgument":{"disp":"n = ","value":"2"},"getBrickTab":1},"bottom":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandML","getBrickArgument":{"disp":"","value":""},"getBrickTab":1},"bottom":{"node":{"getBrickType":"CaseBrick","getBrickCommand":"CommandSD","getBrickArgument":{"disp":"","value":""},"getBrickTab":1},"bottom":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandMR","getBrickArgument":{"disp":"","value":""},"getBrickTab":1},"bottom":{"node":{"getBrickType":"CaseBrick","getBrickCommand":"CommandSC","getBrickArgument":{"disp":"","value":""},"getBrickTab":1},"bottom":"Nil","right":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandMS","getBrickArgument":{"disp":"","value":""},"getBrickTab":1},"bottom":"Nil","right":{"node":{"getBrickType":"CaseBrick","getBrickCommand":"CommandCEC","getBrickArgument":{"disp":"マス分","value":"4"},"getBrickTab":1},"bottom":"Nil","right":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandNone","getBrickArgument":{"disp":"","value":""},"getBrickTab":1},"bottom":"Nil","right":{"node":{"getBrickType":"TailBrick","getBrickCommand":"CommandAT","getBrickArgument":{"disp":"","value":""},"getBrickTab":1},"bottom":"Nil","right":"Nil"}}}}},"right":"Nil"},"right":"Nil"},"right":"Nil"},"right":"Nil"}},{"position":{"x":450,"y":100},"ASTne":{"node":{"getBrickType":"EntryBrick","getBrickCommand":"CommandFuncStart","getBrickArgument":{"disp":"n = ","value":"3"},"getBrickTab":2},"bottom":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandML","getBrickArgument":{"disp":"","value":""},"getBrickTab":2},"bottom":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandMR","getBrickArgument":{"disp":"","value":""},"getBrickTab":2},"bottom":{"node":{"getBrickType":"CaseBrick","getBrickCommand":"CommandSP","getBrickArgument":{"disp":"秒待機","value":"1"},"getBrickTab":2},"bottom":"Nil","right":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandAS","getBrickArgument":{"disp":"","value":""},"getBrickTab":2},"bottom":"Nil","right":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandAF","getBrickArgument":{"disp":"","value":""},"getBrickTab":2},"bottom":"Nil","right":{"node":{"getBrickType":"TailBrick","getBrickCommand":"CommandAT","getBrickArgument":{"disp":"","value":""},"getBrickTab":2},"bottom":"Nil","right":"Nil"}}}},"right":"Nil"},"right":"Nil"},"right":"Nil"}},{"position":{"x":450,"y":100},"ASTne":{"node":{"getBrickType":"EntryBrick","getBrickCommand":"CommandFuncStart","getBrickArgument":{"disp":"n = ","value":"4"},"getBrickTab":3},"bottom":{"node":{"getBrickType":"CaseBrick","getBrickCommand":"CommandSP","getBrickArgument":{"disp":"秒待機","value":"0.2"},"getBrickTab":3},"bottom":{"node":{"getBrickType":"CaseBrick","getBrickCommand":"CommandCEA","getBrickArgument":{"disp":"","value":""},"getBrickTab":3},"bottom":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandAF","getBrickArgument":{"disp":"","value":""},"getBrickTab":3},"bottom":"Nil","right":"Nil"},"right":{"node":{"getBrickType":"TailBrick","getBrickCommand":"CommandAD","getBrickArgument":{"disp":"","value":""},"getBrickTab":3},"bottom":"Nil","right":"Nil"}},"right":"Nil"},"right":"Nil"}},{"position":{"x":450,"y":100},"ASTne":{"node":{"getBrickType":"EntryBrick","getBrickCommand":"CommandFuncStart","getBrickArgument":{"disp":"n = ","value":"5"},"getBrickTab":4},"bottom":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandML","getBrickArgument":{"disp":"","value":""},"getBrickTab":4},"bottom":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandMW","getBrickArgument":{"disp":"","value":""},"getBrickTab":4},"bottom":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandAF","getBrickArgument":{"disp":"","value":""},"getBrickTab":4},"bottom":{"node":{"getBrickType":"TailBrick","getBrickCommand":"CommandReboot","getBrickArgument":{"disp":"","value":""},"getBrickTab":4},"bottom":"Nil","right":"Nil"},"right":"Nil"},"right":"Nil"},"right":"Nil"},"right":"Nil"}},{"position":{"x":450,"y":100},"ASTne":{"node":{"getBrickType":"EntryBrick","getBrickCommand":"CommandFuncStart","getBrickArgument":{"disp":"n = ","value":"6"},"getBrickTab":5},"bottom":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandML","getBrickArgument":{"disp":"","value":""},"getBrickTab":5},"bottom":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandMW","getBrickArgument":{"disp":"","value":""},"getBrickTab":5},"bottom":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandAS","getBrickArgument":{"disp":"","value":""},"getBrickTab":5},"bottom":"Nil","right":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandAS","getBrickArgument":{"disp":"","value":""},"getBrickTab":5},"bottom":"Nil","right":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandAS","getBrickArgument":{"disp":"","value":""},"getBrickTab":5},"bottom":{"node":{"getBrickType":"CaseBrick","getBrickCommand":"CommandSA","getBrickArgument":{"disp":"","value":""},"getBrickTab":5},"bottom":"Nil","right":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandMT","getBrickArgument":{"disp":"","value":""},"getBrickTab":5},"bottom":"Nil","right":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandMR","getBrickArgument":{"disp":"","value":""},"getBrickTab":5},"bottom":"Nil","right":"Nil"}}},"right":"Nil"}}},"right":"Nil"},"right":"Nil"},"right":"Nil"}},{"position":{"x":450,"y":100},"ASTne":{"node":{"getBrickType":"EntryBrick","getBrickCommand":"CommandFuncStart","getBrickArgument":{"disp":"n = ","value":"7"},"getBrickTab":6},"bottom":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandAF","getBrickArgument":{"disp":"","value":""},"getBrickTab":6},"bottom":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandAF","getBrickArgument":{"disp":"","value":""},"getBrickTab":6},"bottom":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandAF","getBrickArgument":{"disp":"","value":""},"getBrickTab":6},"bottom":{"node":{"getBrickType":"TailBrick","getBrickCommand":"CommandFuncStop","getBrickArgument":{"disp":"n = ","value":"4"},"getBrickTab":6},"bottom":"Nil","right":"Nil"},"right":"Nil"},"right":"Nil"},"right":"Nil"},"right":"Nil"}},{"position":{"x":450,"y":100},"ASTne":{"node":{"getBrickType":"EntryBrick","getBrickCommand":"CommandFuncStart","getBrickArgument":{"disp":"n = ","value":"8"},"getBrickTab":7},"bottom":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandML","getBrickArgument":{"disp":"","value":""},"getBrickTab":7},"bottom":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandMLJ","getBrickArgument":{"disp":"","value":""},"getBrickTab":7},"bottom":{"node":{"getBrickType":"CaseBrick","getBrickCommand":"CommandSO","getBrickArgument":{"disp":"","value":""},"getBrickTab":7},"bottom":"Nil","right":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandMR","getBrickArgument":{"disp":"","value":""},"getBrickTab":7},"bottom":"Nil","right":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandMDJ","getBrickArgument":{"disp":"","value":""},"getBrickTab":7},"bottom":"Nil","right":{"node":{"getBrickType":"CaseBrick","getBrickCommand":"CommandSO","getBrickArgument":{"disp":"","value":""},"getBrickTab":7},"bottom":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandAF","getBrickArgument":{"disp":"","value":""},"getBrickTab":7},"bottom":"Nil","right":{"node":{"getBrickType":"TailBrick","getBrickCommand":"CommandFuncStop","getBrickArgument":{"disp":"n = ","value":"4"},"getBrickTab":7},"bottom":"Nil","right":"Nil"}},"right":"Nil"}}}},"right":"Nil"},"right":"Nil"},"right":"Nil"}},{"position":{"x":450,"y":100},"ASTne":{"node":{"getBrickType":"EntryBrick","getBrickCommand":"CommandFuncStart","getBrickArgument":{"disp":"n = ","value":"9"},"getBrickTab":8},"bottom":"Nil","right":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandML","getBrickArgument":{"disp":"","value":""},"getBrickTab":8},"bottom":"Nil","right":{"node":{"getBrickType":"CaseBrick","getBrickCommand":"CommandCEC","getBrickArgument":{"disp":"マス分","value":"2"},"getBrickTab":8},"bottom":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandAS","getBrickArgument":{"disp":"","value":""},"getBrickTab":8},"bottom":{"node":{"getBrickType":"CaseBrick","getBrickCommand":"CommandCEF","getBrickArgument":{"disp":"マス分","value":"5"},"getBrickTab":8},"bottom":{"node":{"getBrickType":"TailBrick","getBrickCommand":"CommandFuncStop","getBrickArgument":{"disp":"n = ","value":"4"},"getBrickTab":8},"bottom":"Nil","right":"Nil"},"right":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandMDJ","getBrickArgument":{"disp":"","value":""},"getBrickTab":8},"bottom":"Nil","right":{"node":{"getBrickType":"TailBrick","getBrickCommand":"CommandFuncStop","getBrickArgument":{"disp":"n = ","value":"4"},"getBrickTab":8},"bottom":"Nil","right":"Nil"}}},"right":"Nil"},"right":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandAF","getBrickArgument":{"disp":"","value":""},"getBrickTab":8},"bottom":"Nil","right":{"node":{"getBrickType":"TailBrick","getBrickCommand":"CommandFuncStop","getBrickArgument":{"disp":"n = ","value":"4"},"getBrickTab":8},"bottom":"Nil","right":"Nil"}}}}}}]';

    //座標と向きを初期化
    this.reset1(); //腕以外
    this.reset2(); //腕
    //アニメーション
    this.anime1 = this.anime_stay();
    this.anime2 = anime();
    
    //キャラクター情報
    //体力
    this.hp = 500;
    //スキル情報　種類、最大値、初期値、回復量
    this.block = [
      ["A"], //スキル1
      ["B", 3, 1, 0.5], //スキル2
      ["C", 5, 0, 1], //スキル3
      ["C", 2, 0, 1], //防御
    ]
    //各スキルが地上でのみ発動可能かどうか
    this.onGround = [false, false, true, true];
    //キャラクタークラスから変更する要素
    this.moveNow = 0; //移動中
    this.jumpNow = 0; //跳躍中
    this.attackNow = 0; //攻撃中
    this.canMove = true; //移動可能
    this.changeAnime = true; //アニメーション切り替え

    //デバッグ用
    // this.label = Label().addChildTo(layer1);
    // this.label.setPosition(140,140);
    // this.label.origin.set(0,0);
  },
  update: function(){
    //デバッグ用
    // this.label.text = "moveNow : " + this.moveNow + "\njumpNow : " + this.jumpNow + "\nattackNow : " + this.attackNow + "\ncanMove : " + this.canMove + "\nchangeAnime : " + this.changeAnime;
    
    //各部位の座標調整
    this.checkHead();
    this.checkRightArm2();
    this.checkLeftArm2();
    this.checkRightArm1();
    this.checkLeftArm1();
    this.checkRightHand();
    this.checkLeftHand();
    this.checkRightLeg();
    this.checkLeftLeg();

    //アニメーション切り替え処理
    if(this.changeAnime){
      console.log("change Anime");
      this.changeAnime = false;
      this.change();
    }
  },
  //アニメーション切り替え用関数
  change: function(){
    //敗北時
    if(this.attackNow == 90){
      this.anime1.reset();
      this.anime2.reset();
      this.reset1();
      this.reset2();
      this.canMove = false;
      this.anime1 = this.anime_delete();
      this.attackNow += 9;
      return;
    }
    //攻撃開始
    if(this.attackNow > 0 && this.attackNow < 10){
      this.anime2.reset();
      this.reset2();
      switch(this.attackNow){
        case 1: //スキル1
          this.anime2 = this.anime_skill1();
          this.attackNow += 10;
          break;
        case 2: //スキル2
          if(chara[this.id].info.block[1][2] < 1){
            this.attackNow = 0;
            break;
          }
          this.anime2 = this.anime_skill2();
          this.attackNow += 10;
          break;
        case 3: //スキル3
          if(chara[this.id].info.block[2][2] > 0){
            this.attackNow = 0;
            break;
          }
          this.anime1.reset();
          this.reset1();
          this.anime1 = this.anime_skill3();
          this.canMove = false;
          this.attackNow += 10;
          chara[this.id].info.block[2][2] = chara[this.id].info.block[2][1];
          chara[this.id].info.updateSkill();
          break;
        case 4: //防御
          if(chara[this.id].info.block[3][2] > 0){
            this.attackNow = 0;
            break;
          }
          this.anime1.reset();
          this.reset1();
          this.anime1 = this.anime_defense();
          this.canMove = false;
          this.attackNow += 10;
          chara[this.id].info.block[3][2] = chara[this.id].info.block[3][1];
          chara[this.id].info.updateSkill();
          break;
        default:
          break;
      }
      // console.log(this.attackNow);
    }
    //スキル3使用または防御中のアニメーションを優先
    if(this.attackNow == 13 || this.attackNow == 14) return;
    //ジャンプ
    if(this.jumpNow == 1){
      this.jumpNow += 1;
      this.anime1.reset();
      this.reset1();
      this.anime1 = this.anime_jump();
    }
    //移動状態
    switch(this.moveNow){
      case 0: //待機
      case -3:
        if(!this.jumpNow){
          this.anime1.reset();
          this.reset1();
          this.anime1 = this.anime_stay();
        }
        this.moveNow = -1;
        break;
      case 1: //歩行
        if(!this.jumpNow){
          this.anime1.reset();
          this.reset1();
          this.anime1 = this.anime_walk();
        }
        this.moveNow += 2;
        break;
      case 2: //走行
        if(!this.jumpNow){
          this.anime1.reset();
          this.reset1();
          this.anime1 = this.anime_run();
        }
        this.moveNow += 2;
        break;
      default:
        break;
    }
    return;
  },
  //座標と向きの初期化
  //腕以外
  reset1: function(){
    this.body.setPosition(-10, 10);
    this.R_foot.setPosition(-60+20, 120-15);
    this.L_foot.setPosition(60-41, 120-15);
    this.head.rotation = 0;
    this.body.rotation = 5;
    this.R_foot.rotation = 0;
    this.L_foot.rotation = 0;
    this.head.setPosition(this.body.x, this.body.y-52);
    this.checkHead();
    this.checkRightLeg();
    this.checkLeftLeg();
  },
  //腕
  reset2: function(){
    this.R_arm2.rotation = 20;
    this.R_arm1.rotation = 0;
    this.R_hand.rotation = 10;
    this.L_arm2.rotation = -10;
    this.L_arm1.rotation = -20;
    this.L_hand.rotation = 0;
    this.checkRightArm2();
    this.checkLeftArm2();
    this.checkRightArm1();
    this.checkLeftArm1();
    this.checkRightHand();
    this.checkLeftHand();
    //this.checkAxe();
  },
  //----------------------------------------------------------------//
  //調整：右手
  checkRightHand(match){
    var rad = this.R_arm1.rotation/180*Math.PI;
    var cos = Math.cos(rad);
    var sin = Math.sin(rad);
    var joint = {x:this.R_arm1.x-42*sin, y:this.R_arm1.y+42*cos};
    this.R_hand.setPosition(joint.x, joint.y);
    if(match) this.R_hand.rotation = this.R_arm1.rotation;
    this.checkAxe();
  },
  //調整：斧
  checkAxe(){
    this.axe.setPosition(this.R_hand.x, this.R_hand.y);
    this.axe.rotation = this.R_hand.rotation;
  },
  //調整：左手
  checkLeftHand(match){
    var rad = this.L_arm1.rotation/180*Math.PI;
    var cos = Math.cos(rad);
    var sin = Math.sin(rad);
    var joint = {x:this.L_arm1.x-42*sin, y:this.L_arm1.y+42*cos};
    this.L_hand.setPosition(joint.x, joint.y);
    if(match) this.L_hand.rotation = this.L_arm1.rotation;
  },
  //調整：右腕
  checkRightArm1(match){
    var rad = this.R_arm2.rotation/180*Math.PI;
    var cos = Math.cos(rad);
    var sin = Math.sin(rad);
    var joint = {x:this.R_arm2.x-45*sin, y:this.R_arm2.y+45*cos};
    this.R_arm1.setPosition(joint.x, joint.y);
    if(match) this.R_arm1.rotation = this.R_arm2.rotation;
  },
  //調整：左腕
  checkLeftArm1(match){
    var rad = this.L_arm2.rotation/180*Math.PI;
    var cos = Math.cos(rad);
    var sin = Math.sin(rad);
    var joint = {x:this.L_arm2.x-45*sin, y:this.L_arm2.y+45*cos};
    this.L_arm1.setPosition(joint.x, joint.y);
    if(match) this.L_arm1.rotation = this.L_arm2.rotation;
  },
  //調整：右肩
  checkRightArm2(){
    var rad = this.body.rotation/180*Math.PI;
    var cos = Math.cos(rad);
    var sin = Math.sin(rad);
    var joint = {x:this.body.x-21*cos+46*sin, y:this.body.y-46*cos-21*sin};
    this.R_arm2.setPosition(joint.x, joint.y);
  },
  //調整：左肩
  checkLeftArm2(){
    var rad = this.body.rotation/180*Math.PI;
    var cos = Math.cos(rad);
    var sin = Math.sin(rad);
    var joint = {x:this.body.x+23*cos+46*sin, y:this.body.y-46*cos+23*sin};
    this.L_arm2.setPosition(joint.x, joint.y);
  },
  //調整：頭部
  checkHead(){
    var rad = this.body.rotation/180*Math.PI;
    var cos = Math.cos(rad);
    var sin = Math.sin(rad);
    var joint = {x:this.body.x+52*sin, y:this.body.y-52*cos};
    this.head.setPosition(joint.x, joint.y);
  },
  //調整：右脚
  checkRightLeg(){
    var joint1 = {x:this.body.x-11, y:this.body.y+8};
    var joint2 = {x:this.R_foot.x, y:this.R_foot.y};
    this.R_leg2.setPosition(joint1.x, joint1.y);
    this.R_leg1.setPosition(joint2.x, joint2.y);
    var x = joint1.x-joint2.x;
    var y = joint2.y-joint1.y;
    var length = Math.sqrt(x**2 + y**2);
    var leg_l = 62 -12;
    this.R_leg2.rotation = (-Math.acos((length**2+leg_l**2-leg_l**2)/(2*length*leg_l)) +Math.atan(x/y)) /Math.PI*180;
    this.R_leg1.rotation = ( Math.acos((length**2-leg_l**2+leg_l**2)/(2*length*leg_l)) +Math.atan(x/y)) /Math.PI*180;
  },
  //調整：左脚
  checkLeftLeg(){
    var joint1 = {x:this.body.x+11, y:this.body.y+8};
    var joint2 = {x:this.L_foot.x, y:this.L_foot.y};
    this.L_leg2.setPosition(joint1.x, joint1.y);
    this.L_leg1.setPosition(joint2.x, joint2.y);
    var x = joint1.x-joint2.x;
    var y = joint2.y-joint1.y;
    var length = Math.sqrt(x**2 + y**2);
    var leg_l = 62 -12;
    this.L_leg2.rotation = (-Math.acos((length**2+leg_l**2-leg_l**2)/(2*length*leg_l)) +Math.atan(x/y)) /Math.PI*180;
    this.L_leg1.rotation = ( Math.acos((length**2-leg_l**2+leg_l**2)/(2*length*leg_l)) +Math.atan(x/y)) /Math.PI*180;
  },
  //----------------------------------------------------------------//
  //アニメーション：静止
  anime_stay: function(){
    //this.reset();
    var a = anime({
      targets: this.body,
      y: '+=10',
      easing: 'easeInOutSine',
      duration: 600,
      loop: true,
      direction: 'alternate',
    });
    return a;
  },
  //アニメーション：歩行
  anime_walk: function(){
    this.body.x = 0;
    this.body.y = 23;
    var a = anime.timeline({
      targets: this.R_foot,
      x: [
        {value: '-=10', duration: 250, easing: 'linear' },
        {value: '+=60', duration: 500, easing: 'easeInOutSine' },
        {value: '-=50', duration: 250, easing: 'linear' },
      ],
      y: [
        {value: '-=20', duration: 250, easing: 'easeOutSine', delay: 250 },
        {value: '+=20', duration: 250, easing: 'easeInSine', endDelay: 250 },
      ],
      loop: true,
    }).add({
      targets: this.L_foot,
      x: [
        {value: '-=30', duration: 0, easing: 'linear' },
        {value: '+=30', duration: 250, easing: 'easeOutSine' },
        {value: '-=60', duration: 500, easing: 'linear' },
        {value: '+=30', duration: 250, easing: 'easeInSine' },
      ],
      y: [
        {value: '-=20', duration: 0, easing: 'linear' },
        {value: '+=20', duration: 250, easing: 'easeInSine', endDelay: 500 },
        {value: '-=20', duration: 250, easing: 'easeOutSine' },
      ],
    },0).add({
      targets: this.body,
      y: [
        {value: '-=20', duration: 0, easing: 'linear' },
        {value: '+=20', duration: 250, easing: 'easeInSine' },
        {value: '-=20', duration: 250, easing: 'easeOutSine' },
        {value: '+=20', duration: 250, easing: 'easeInSine' },
        {value: '-=20', duration: 250, easing: 'easeOutSine' },
      ],
    },0)
    return a;
  },
  //アニメーション：走行
  anime_run: function(){
    //this.reset();
    this.body.x = 0;
    this.body.y = 23;
    this.body.rotation = 20;
    var a = anime.timeline({
      targets: this.R_foot,
      x: [
        {value: '-=40', duration: 170, easing: 'linear' },
        {value: '+=120', duration: 260, easing: 'easeInOutSine' },
        {value: '-=80', duration: 170, easing: 'linear' },
      ],
      y: [
        {value: '-=15', duration: 0},
        {value: '-=15', duration: 130, easing: 'linear' },
        {value: '-=20', duration: 170, easing: 'easeOutSine' },
        {value: '+=60', duration: 170, easing: 'easeInSine' },
        {value: '-=15', duration: 130, easing: 'linear' },
      ],
      rotation: [
        {value: 15, duration: 0},
        {value: 30, duration: 130, easing: 'easeOutSine' },
        {value: -30, duration: 240, easing: 'easeOutSine' },
        {value: 0, duration: 100, easing: 'easeOutSine' },
        {value: 15, duration: 130, easing: 'linear' },
      ],
      loop: true,
    }).add({
      targets: this.L_foot,
      x: [
        {value: '+=20', duration: 170, easing: 'easeOutSine' },
        {value: '-=110', duration: 260, easing: 'linear' },
        {value: '+=90', duration: 170, easing: 'easeInSine' },
      ],
      y: [
        {value: '-=50', duration: 0, easing: 'linear' },
        {value: '+=60', duration: 170, easing: 'easeInSine' },
        {value: '-=30', duration: 260, easing: 'linear' },
        {value: '-=20', duration: 170, easing: 'easeOutSine' },
      ],
      rotation: [
        {value: -28, duration: 0},
        {value: -30, duration: 70, easing: 'easeOutSine' },
        {value: 0, duration: 100, easing: 'easeOutSine' },
        {value: 30, duration: 260, easing: 'easeOutSine' },
        {value: -28, duration: 170, easing: 'easeOutSine' },
      ],
    },0).add({
      targets: this.body,
      y: [
        {value: '-=20', duration: 0, easing: 'linear' },
        {value: '+=20', duration: 150, easing: 'easeInSine' },
        {value: '-=20', duration: 150, easing: 'easeOutSine' },
        {value: '+=20', duration: 150, easing: 'easeInSine' },
        {value: '-=20', duration: 150, easing: 'easeOutSine' },
      ],
    },0)
    return a;
  },
  //アニメーション：跳躍
  anime_jump: function(){
    var a = anime.timeline({
      targets: this.R_foot,
      x: '+=10',
      y: '-=10',
      rotation: 20,
      duration: 50,
      easing: 'easeOutSine',
    }).add({
      targets: this.L_foot,
      x: '+=15',
      y: '-=40',
      duration: 50,
      easing: 'easeOutSine',
    },0).add({
      targets: this.body,
      y: '-=20',
      rotation: 0,
      duration: 50,
      easing: 'easeOutSine',
    },0)
    return a;
  },
  //アニメーション：防御
  anime_defense: function(){
    //this.reset();
    var a = anime.timeline({
      targets: this.R_arm2,
      rotation: -30,
      duration: 50,
      easing: 'easeOutSine',
      //loop: true,
    }).add({
      targets: this.R_arm1,
      rotation: -90,
      duration: 50,
      easing: 'easeOutSine',
    },0).add({
      targets: this.R_hand,
      rotation: -80,
      duration: 50,
      easing: 'easeOutSine',
    },0).add({
      targets: this.L_arm2,
      rotation: -20,
      duration: 50,
      easing: 'easeOutSine',
    },0).add({
      targets: this.L_arm1,
      rotation: -170,
      duration: 50,
      easing: 'easeOutSine',
    },0).add({
      targets: this.body,
      y: '+=40',
      rotation: 0,
      duration: 50,
      easing: 'easeOutSine',
    },0)
    return a;
  },
  anime_skill1: function() {
    var a = anime.timeline({
      targets: this.R_arm2,
      rotation: [
        {value: -80, duration: 500, easing: 'easeOutSine' },
        {value: 60, endDelay: 600, duration: 50, easing: 'easeOutSine' },
        {value: 20, duration: 500, easing: 'easeOutSine' },
      ],
      complete: ()=> {
        this.attackNow = 0;
        this.changeAnime = true;
      }
    }).add({
      targets: this.R_arm1,
      rotation: [
        {value: -160, duration: 500, easing: 'easeOutSine' },
        {value: 60, endDelay: 600, duration: 50, easing: 'easeOutSine' },
        {value: 0, duration: 500, easing: 'easeOutSine' },
      ],
    },0).add({
      targets: this.R_hand,
      rotation: [
        {value: -110, duration: 500, easing: 'easeOutSine' },
        {value: 150, endDelay: 600, duration: 50, easing: 'easeOutSine' },
        {value: 10, duration: 500, easing: 'easeOutSine' },
      ],
    },0).add({
      begin: ()=> {
        console.log("skill1 >> slash !!!");
        var mP = getCharaPosition(this.id);
        Slash1(mP.x+60*mP.d, mP.y, mP.d, this.id).addChildTo(layer1);
      },
    },500);
    return a;
  },
  anime_skill2: function() {
    var a = anime.timeline({
      targets: this.L_arm2,
      rotation: [
        {value: 70, duration: 500, easing: 'easeOutSine' },
        {value: -70, duration: 100, endDelay: 400, easing: 'easeInSine' },
        {value: -10, duration: 500, easing: 'easeInOutSine' },
      ],
      complete: () => {
        this.attackNow = 0;
        this.changeAnime = true;
      }
    }).add({
      targets: this.L_arm1,
      rotation: [
        {value: -50, duration: 500, easing: 'easeOutSine' },
        {value: -100, duration: 100, endDelay: 400, easing: 'easeInSine' },
        {value: -20, duration: 500, easing: 'easeInOutSine' },
      ],
    },0).add({
      begin: ()=>{
        var mP = getCharaPosition(this.id);
        if(chara[this.id].info.block[1][2] >= 1.0){
          chara[this.id].info.block[1][2] -= 1;
          chara[this.id].info.updateSkill();
          Bomb2(mP.x+100*mP.d, mP.y-20, mP.d, this.id).addChildTo(layer1);
        }
      },
    },600);
    return a;
  },
  anime_skill3: function() {
    var a = anime.timeline({
      targets: this.body,
      y: [
        {value: '+=10', duration: 1000, easing: 'easeInSine' },
        {value: '+=20', duration: 50, endDelay: 900, easing: 'easeInSine' },
        {value: '-=30', duration: 1000, easing: 'easeInSine' },
      ],
      rotation: [
        {value: -5, duration: 1000, easing: 'easeInSine'},
        {value: 35, duration: 60, endDelay: 900, easing: 'easeInSine'},
        {value: 5, duration: 1000, easing: 'easeInSine'},
      ],
      complete: ()=> {
        this.attackNow = 0;
        this.canMove = true;
        this.changeAnime = true;
      }
    }).add({
      targets: this.L_foot,
      y: [
        {value: '-=20', duration: 900, easing: 'easeInSine' },
        {value: '+=20', duration: 150, endDelay: 1900, easing: 'easeInSine' },
      ],
      x: [
        {value: '+=10', duration: 900, easing: 'easeInSine' },
        {value: '+=5', duration: 150, endDelay: 900, easing: 'easeInSine' },
        {value: '-=15', duration: 1000, easing: 'easeInSine' },
      ],
    }).add({
      targets: this.head,
      rotation: [
        {value: 35, duration: 50, endDelay: 900, easing: 'easeInSine'},
        {value: 0, duration: 1000, easing: 'easeInSine'},
      ],
    },1000).add({
      targets: this.R_hand,
      rotation: [
        {value: 380+360*10, duration: 1050, endDelay: 900, easing: 'easeInCirc'},
        {value: 370+360*10, duration: 1000, easing: 'easeInSine'},
      ]
    },0).add({
      targets: this.R_arm1,
      rotation: [
        {value: 160, duration: 1000, easing: 'easeInSine'},
        {value: 290, duration: 50, endDelay: 900, easing: 'easeInSine'},
        {value: 360, duration: 1000, easing: 'easeInSine'},
      ]
    },0).add({
      targets: this.R_arm2,
      rotation: [
        {value: 140, duration: 1000, easing: 'easeInSine'},
        {value: 330, duration: 50, endDelay: 900, easing: 'easeInSine'},
        {value: 380, duration: 1000, easing: 'easeInSine'},
      ]
    },0).add({
      targets: this.L_arm1,
      rotation: [
        {value: 15, duration: 1000, easing: 'easeInSine'},
        {value: 80, duration: 50, endDelay: 900, easing: 'easeInSine'},
        {value: -20, duration: 1000, easing: 'easeInSine'},
      ]
    },0).add({
      targets: this.L_arm2,
      rotation: [
        {value: -70, duration: 1000, easing: 'easeInSine'},
        {value: 90, duration: 50, endDelay: 900, easing: 'easeInSine'},
        {value: -10, duration: 1000, easing: 'easeInSine'},
      ]
    },0).add({
      begin: () => {
        var mP = getCharaPosition(this.id);
        Clash3(mP.x+180*mP.d, mP.y+130, mP.d, this.id).addChildTo(layer1);
      },
    },1050);
    return a;
  },
  //アニメーション：負傷
  anime_delete: function(){
    var a = anime.timeline({
      targets: this.body,
      y: '+=50',
      rotation: 40,
      duration: 50,
      easing: 'easeOutSine',
    }).add({
      targets: this.head,
      rotation: 70,
      duration: 50,
      easing: 'easeOutSine',
    },0).add({
      targets: this.R_hand,
      rotation: -5,
      duration: 50,
      easing: 'easeOutSine',
    },0).add({
      targets: this.L_arm1,
      rotation: -40,
      duration: 50,
      easing: 'easeOutSine',
    },0)
    return a;
  },
  //使用する関数を自動選択するAI
  progAST: function(){
    var n = 0;
    var myInfo = chara[this.id].info;
    var enInfo = chara[(this.id-1)%2].info;
    if(info.turn > 1){
      if (!myInfo.block[2][2]) n = anime.random(2,3);
      else if(myInfo.block[2][2] > 2 && !enInfo.block[3][2]) n = anime.random(5,9);
      else n = anime.random(7,9);
    }else n = 1;
    return n;
  }
}); 

//================================================================//

//Player1が撃つ弾1　斬撃
phina.define("Slash1", {
  superClass: 'Sprite',
  init: function(x, y, d, id) {
    this.id = id;
    this.superInit('P1_slash');
    this.setPosition(x,y);
    this.origin.set(0, 0.5);
    this.scaleX = d;
    //FixtureDef.shapeの定義
    var scale = layer.world._scale;
    var size = {w:this.width/scale/2, h:this.height/scale/2};
    this.shape = new b2.PolygonShape();
    var vertices = new Array();
    vertices.push(new b2.Vec2(-size.w, -size.h));
    vertices.push(new b2.Vec2(      0, -size.h*0.9));
    vertices.push(new b2.Vec2( size.w, 0));
    vertices.push(new b2.Vec2(      0, size.h*0.9));
    vertices.push(new b2.Vec2(-size.w, size.h));
    this.shape.SetAsVector(vertices, 5);
    //box2dオブジェクトの作成
    this.obj = CreateSlash(this.width, this.height, x, y, d, 0, this.shape, 1, id, 50);
    //消滅アニメーション
    anime({
      targets: this,
      alpha: 0,
      duration: 1000,
      delay: 100,
      easing: 'easeOutSine',
      complete: ()=> { this.delete(); },
    })
  },
  update: function(){
  },
  //消滅完了時の処理　自身の削除のみ
  delete: function(){
    this.remove();
  },
});

//================================================================//

//Player1が撃つ弾2-1　爆弾
phina.define("Bomb2", {
  superClass: 'CircleShape',
  init: function(x, y, d, id) {
    this.id = id;
    this.superInit({
      radius: 30,
      x: x,
      y: y,
      fill: '#222222',
      stroke: '#000000',
      strokeWidth: 8,
    });
    this.origin.set(0.5, 0.5);
    
    //速度
    this.v = 20;
    //角度
    this.d = d;
    if(d>0) this.r = 45; //右
    else this.r = 180-45; //左
    //box2dオブジェクトの作成
    this.obj = CreateBullet(this.width, this.x, this.y, this.r, this.v, this.id, 0, 10);
    //ステージも衝突判定の対象とする
    this.obj.body.GetFixtureList().m_filter.maskBits |= C_Stage;
  },
  update: function(){
    const xy = this.obj.body.GetPosition();
    this.x = xy.x*layer.world._scale;
    this.y = xy.y*layer.world._scale;
    this.rotation = this.obj.body.GetAngle() /Math.PI *180;
    if(this.obj.disappear == true){
      this.delete();
    }
  },
  //消滅時の処理
  delete: function(){
    //爆風の出現
    Bomb22(this.x, this.y, this.id).addChildTo(layer1);//見た目
    CreateBlast(240, this.x, this.y, this.id, 100);//当たり判定
    //自身を削除
    this.remove();
  }
});
//Player1が撃つ弾2-2　爆風
phina.define("Bomb22", {
  superClass: 'CircleShape',
  init: function(x, y, id) {
    this.id = id;
    this.superInit({
      radius: 120,
      x: x,
      y: y,
      fill: '#ff5500',
      stroke: '#ff0000',
      strokeWidth: 8,
      scaleX: 0,
      scaleY: 0,
      alpha: 1,
    });
    this.origin.set(0.5, 0.5);
    //出現と消滅のアニメーション
    anime({
      targets: this,
      scaleX: [
        {value: 1, duration: 100, endDelay: 500, easing: 'easeOutBack' }
      ],
      scaleY: [
        {value: 1, duration: 100, endDelay: 500, easing: 'easeOutBack' }
      ],
      alpha: [
        {value: 0, duration: 500, delay: 100, easing: 'easeInSine' }
      ],
      complete: ()=> { this.delete(); },
    });
  },
  update: function(){
  },
  //消滅完了時の処理　自身を削除するだけ
  delete: function(){
    this.remove();
  }
});

//================================================================//

//Player1が撃つ弾3　衝撃波
phina.define("Clash3", {
  superClass: 'Sprite',
  init: function(x, y, d, id) {
    //衝撃波1(自身)
    this.superInit('P1_shock');
    this.setPosition(x,y);
    this.origin.set(0, 1);
    this.d = d;
    this.scaleX = 0;
    this.scaleY = 0;
    this.dummy = {};
    //当たり判定
    this.obj = CreateSlash(120*5.5, 360, x, y, d, 0, 'box', 5, id, 200, true);
    //出現と消滅のアニメーション
    anime.timeline({
      targets: this,
      scaleX: [
        {value: this.d, endDelay: 800, duration: 200, easing: 'easeOutCirc'},
      ],
      scaleY: [
        {value: 1, endDelay: 800, duration: 200, easing: 'easeOutCirc'},
      ],
      alpha: [
        {value: 0, delay: 200, duration: 800, easing: 'linear'},
      ],
      complete: () => { this.delete(); },
    }).add({
      targets: this.dummy,
    },0).add({
      begin: () => { this.obj.delete(); },
    },200);
  },
  update: function(){
  },
  //消滅完了時の処理　自身を削除するだけ
  delete: function(){
    this.remove();
  },
});



//================================================================//



//敵キャラクターのアニメーション
//討伐対象
//コードを改ざんすれば操作可能
phina.define("Enemy", {
  superClass: 'DisplayElement',
  init: function(id) {
    this.id = id;
    this.superInit();
    this.origin.set(0.5,0.5);
    this.setPosition(0,0);
    this.width = 240;
    this.height = 420;
    //左肩
    this.L_arm2 = Sprite('E_arm2').addChildTo(this);
    this.L_arm2.origin.set(0.5,0.22);
    //左手
    this.L_hand = Sprite('E_hand').addChildTo(this);
    this.L_hand.origin.set(0.5,0.5);
    //左腕
    this.L_arm1 = Sprite('E_arm1').addChildTo(this);
    this.L_arm1.origin.set(0.5,0.142);
    //左腿
    this.L_leg2 = Sprite('E_L2').addChildTo(this);
    this.L_leg2.origin.set(0.5,0.1);
    //左脚
    this.L_leg1 = Sprite('E_L1').addChildTo(this);
    this.L_leg1.origin.set(0.5,1);
    //左足
    this.L_foot = Sprite('E_foot').addChildTo(this);
    this.L_foot.origin.set(0.25,0.5);
    //腰
    this.body = Sprite('E_body').addChildTo(this);
    this.body.origin.set(0.42,0.67);
    //右腿
    this.R_leg2 = Sprite('E_R2').addChildTo(this);
    this.R_leg2.origin.set(0.5,0.2);
    //右脚
    this.R_leg1 = Sprite('E_R1').addChildTo(this);
    this.R_leg1.origin.set(0.5,1);
    //右足
    this.R_foot = Sprite('E_foot').addChildTo(this);
    this.R_foot.origin.set(0.25,0.5);
    //頭
    this.head = Sprite('E_head').addChildTo(this);
    this.head.origin.set(0.25,1);
    //右肩
    this.R_arm2 = Sprite('E_arm2').addChildTo(this);
    this.R_arm2.origin.set(0.5,0.22);
    //右手
    this.R_hand = Sprite('E_hand').addChildTo(this);
    this.R_hand.origin.set(0.5,0.5);
    //右腕
    this.R_arm1 = Sprite('E_arm1').addChildTo(this);
    this.R_arm1.origin.set(0.5,0.142);
    //非操作時のプログラム
    this.autoProg = '[{"position":{"x":450,"y":100},"ASTne":{"node":{"getBrickType":"EntryBrick","getBrickCommand":"CommandFuncStart","getBrickArgument":{"disp":"n = ","value":"1"},"getBrickTab":0},"bottom":"Nil","right":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandAF","getBrickArgument":{"disp":"","value":""},"getBrickTab":0},"bottom":"Nil","right":"Nil"}}},{"position":{"x":450,"y":100},"ASTne":{"node":{"getBrickType":"EntryBrick","getBrickCommand":"CommandFuncStart","getBrickArgument":{"disp":"n = ","value":"2"},"getBrickTab":1},"bottom":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandAS","getBrickArgument":{"disp":"","value":""},"getBrickTab":1},"bottom":"Nil","right":"Nil"},"right":"Nil"}},{"position":{"x":450,"y":100},"ASTne":{"node":{"getBrickType":"EntryBrick","getBrickCommand":"CommandFuncStart","getBrickArgument":{"disp":"n = ","value":"3"},"getBrickTab":2},"bottom":"Nil","right":{"node":{"getBrickType":"CaseBrick","getBrickCommand":"CommandSP","getBrickArgument":{"disp":"秒待機","value":"1"},"getBrickTab":2},"bottom":"Nil","right":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandAF","getBrickArgument":{"disp":"","value":""},"getBrickTab":2},"bottom":"Nil","right":"Nil"}}}},{"position":{"x":450,"y":100},"ASTne":{"node":{"getBrickType":"EntryBrick","getBrickCommand":"CommandFuncStart","getBrickArgument":{"disp":"n = ","value":"4"},"getBrickTab":3},"bottom":{"node":{"getBrickType":"CaseBrick","getBrickCommand":"CommandSP","getBrickArgument":{"disp":"秒待機","value":"1"},"getBrickTab":3},"bottom":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandAS","getBrickArgument":{"disp":"","value":""},"getBrickTab":3},"bottom":"Nil","right":"Nil"},"right":"Nil"},"right":"Nil"}},{"position":{"x":450,"y":100},"ASTne":{"node":{"getBrickType":"EntryBrick","getBrickCommand":"CommandFuncStart","getBrickArgument":{"disp":"n = ","value":"5"},"getBrickTab":4},"bottom":"Nil","right":{"node":{"getBrickType":"TailBrick","getBrickCommand":"CommandAT","getBrickArgument":{"disp":"","value":""},"getBrickTab":4},"bottom":"Nil","right":"Nil"}}},{"position":{"x":450,"y":100},"ASTne":{"node":{"getBrickType":"EntryBrick","getBrickCommand":"CommandFuncStart","getBrickArgument":{"disp":"n = ","value":"6"},"getBrickTab":5},"bottom":"Nil","right":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandML","getBrickArgument":{"disp":"","value":""},"getBrickTab":5},"bottom":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandMR","getBrickArgument":{"disp":"","value":""},"getBrickTab":5},"bottom":"Nil","right":{"node":{"getBrickType":"CaseBrick","getBrickCommand":"CommandSP","getBrickArgument":{"disp":"秒待機","value":"1"},"getBrickTab":5},"bottom":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandMS","getBrickArgument":{"disp":"","value":""},"getBrickTab":5},"bottom":{"node":{"getBrickType":"TailBrick","getBrickCommand":"CommandAD","getBrickArgument":{"disp":"","value":""},"getBrickTab":5},"bottom":"Nil","right":"Nil"},"right":"Nil"},"right":"Nil"}},"right":"Nil"}}},{"position":{"x":450,"y":100},"ASTne":{"node":{"getBrickType":"EntryBrick","getBrickCommand":"CommandFuncStart","getBrickArgument":{"disp":"n = ","value":"7"},"getBrickTab":6},"bottom":"Nil","right":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandML","getBrickArgument":{"disp":"","value":""},"getBrickTab":6},"bottom":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandMR","getBrickArgument":{"disp":"","value":""},"getBrickTab":6},"bottom":{"node":{"getBrickType":"CaseBrick","getBrickCommand":"CommandSC","getBrickArgument":{"disp":"","value":""},"getBrickTab":6},"bottom":"Nil","right":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandMT","getBrickArgument":{"disp":"","value":""},"getBrickTab":6},"bottom":"Nil","right":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandMDJ","getBrickArgument":{"disp":"","value":""},"getBrickTab":6},"bottom":{"node":{"getBrickType":"CaseBrick","getBrickCommand":"CommandSO","getBrickArgument":{"disp":"","value":""},"getBrickTab":6},"bottom":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandAF","getBrickArgument":{"disp":"","value":""},"getBrickTab":6},"bottom":"Nil","right":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandML","getBrickArgument":{"disp":"","value":""},"getBrickTab":6},"bottom":"Nil","right":"Nil"}},"right":"Nil"},"right":"Nil"}}},"right":"Nil"},"right":"Nil"}}},{"position":{"x":450,"y":100},"ASTne":{"node":{"getBrickType":"EntryBrick","getBrickCommand":"CommandFuncStart","getBrickArgument":{"disp":"n = ","value":"8"},"getBrickTab":7},"bottom":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandAF","getBrickArgument":{"disp":"","value":""},"getBrickTab":7},"bottom":"Nil","right":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandAS","getBrickArgument":{"disp":"","value":""},"getBrickTab":7},"bottom":"Nil","right":{"node":{"getBrickType":"TailBrick","getBrickCommand":"CommandAD","getBrickArgument":{"disp":"","value":""},"getBrickTab":7},"bottom":"Nil","right":"Nil"}}},"right":"Nil"}},{"position":{"x":450,"y":100},"ASTne":{"node":{"getBrickType":"EntryBrick","getBrickCommand":"CommandFuncStart","getBrickArgument":{"disp":"n = ","value":"9"},"getBrickTab":8},"bottom":{"node":{"getBrickType":"BasicBrick","getBrickCommand":"CommandMW","getBrickArgument":{"disp":"","value":""},"getBrickTab":8},"bottom":"Nil","right":{"node":{"getBrickType":"CaseBrick","getBrickCommand":"CommandSD","getBrickArgument":{"disp":"","value":""},"getBrickTab":8},"bottom":"Nil","right":{"node":{"getBrickType":"TailBrick","getBrickCommand":"CommandAT","getBrickArgument":{"disp":"","value":""},"getBrickTab":8},"bottom":"Nil","right":"Nil"}}},"right":"Nil"}}]';
    
    //状態の初期化
    this.reset();
    //アニメーション
    this.anime = this.anime_stay();
    
    //キャラクター情報
    this.hp = 800;
    this.block = [
      ["B", 10, 4, 2], //スキル1
      ["B", 1, 1, 0.5], //スキル2
      ["C", 5, 0, 1], //スキル3
      ["C", 2, 0, 1], //防御
    ]
    this.onGround = [true, true, true, true];

    this.moveNow = 0;
    this.jumpNow = 0;
    this.attackNow = 0;
    this.canMove = true;
    this.changeAnime = true;
    
    //デバッグ用
    // this.label = Label().addChildTo(layer1);
    // this.label.setPosition(120*16-140,140);
    // this.label.origin.set(1,0);
  },
  update: function(){
    //デバッグ用
    // this.label.text = "moveNow : " + this.moveNow + "\njumpNow : " + this.jumpNow + "\nattackNow : " + this.attackNow + "\ncanMove : " + this.canMove + "\nchangeAnime : " + this.changeAnime;
    //各パーツの座標と向きの更新
    this.checkHead();
    this.checkRightArm2();
    this.checkLeftArm2();
    this.checkRightLeg();
    this.checkLeftLeg();
    if(this.attackNow == 11){
      this.checkRightArm1(true);
      this.checkLeftArm1(true);
    }else{
      this.checkRightArm1(false);
      this.checkLeftArm1(false);
    }
    
    //アニメーション切り替え処理
    if(this.changeAnime){
      this.changeAnime = false;
      this.change();
    }
  },
  //アニメーション切り替え用関数
  change: function(){
    //敗北時
    if(this.attackNow == 90){
      this.anime.reset();
      this.reset();
      this.canMove = false;
      this.anime = this.anime_delete();
      this.attackNow += 9;
      return;
    }
    //攻撃開始
    if(this.attackNow > 0){
      if(this.attackNow < 10){
        console.log(chara[this.id].info.block);
        this.anime.reset();
        this.reset();
        this.canMove = false;
        switch(this.attackNow){
          case 1:
            if(chara[this.id].info.block[0][2] < 1){
              this.attackNow = 0;
              console.log("why");
              return;
            }
            this.anime = this.anime_skill1();
            break;
          case 2:
            if(chara[this.id].info.block[1][2] < 1){
              this.attackNow = 0;
              return;
            }
            this.anime = this.anime_skill2();
            break;
          case 3:
            if(chara[this.id].info.block[2][2] > 0){
              this.attackNow = 0;
              return;
            }
            this.anime = this.anime_skill3();
            chara[this.id].info.block[2][2] = chara[this.id].info.block[2][1];
            chara[this.id].info.updateSkill();
            break;
          case 4:
            if(chara[this.id].info.block[3][2] > 0){
              this.attackNow = 0;
              return;
            }
            this.anime = this.anime_defense();
            chara[this.id].info.block[3][2] = chara[this.id].info.block[3][1];
            chara[this.id].info.updateSkill();
            break;
          default:
            break;
        }
        this.attackNow += 10;
      }
      //攻撃状態を優先
      return;
    }
    //ジャンプ
    if(this.jumpNow == 1){
      this.jumpNow += 1;
      this.anime.reset();
      this.reset();
      this.anime = this.anime_jump();
    }
    //移動状態
    switch(this.moveNow){
      case 0:
      case -3:
        if(!this.jumpNow){
          this.anime.reset();
          this.reset();
          this.anime = this.anime_stay();
        }
        this.moveNow = -1;
        break;
      case 1:
        if(!this.jumpNow){
          this.anime.reset();
          this.reset();
          this.anime = this.anime_walk();
        }
        this.moveNow += 2;
        break;
      case 2:
        if(!this.jumpNow){
          this.anime.reset();
          this.reset();
          this.anime = this.anime_run();
        }
        this.moveNow += 2;
        break;
      default:
        break;
    }
    return;
  },
  //座標と向きの初期化
  reset: function(){
    this.body.setPosition(62.4-120, 263.76-210);
    this.R_foot.setPosition(this.width*0.09-120, this.height*0.953-210);
    this.L_foot.setPosition(this.width*0.71-120, this.height*0.953-210);
    this.head.rotation = 0;
    this.body.rotation = 0;
    this.R_arm2.rotation = 0;
    this.R_arm1.rotation = 0;
    this.R_hand.rotation = 0;
    this.L_arm2.rotation = 0;
    this.L_arm1.rotation = 0;
    this.L_hand.rotation = 0;
    this.R_foot.rotation = 0;
    this.L_foot.rotation = 0;
    this.checkHead();
    this.checkRightArm2();
    this.checkLeftArm2();
    this.checkRightArm1(true);
    this.checkLeftArm1(true);
    this.checkRightHand();
    this.checkLeftHand();
    this.checkRightLeg();
    this.checkLeftLeg();
  },
  //----------------------------------------------------------------//
  //アニメーション：静止
  anime_stay: function(){
    this.reset();
    var a = anime({
      targets: this.body,
      y: '+=10',
      easing: 'easeInOutSine',
      duration: 600,
      loop: true,
      direction: 'alternate',
    });
    return a;
  },
  //アニメーション：歩行
  anime_walk: function(){
    this.reset();
    var a = anime.timeline({
      targets: this.R_foot,
      x: [
        {value: '-=30', duration: 250, easing: 'linear' },
        {value: '+=100', duration: 500, easing: 'easeInOutSine' },
        {value: '-=70', duration: 250, easing: 'linear' },
      ],
      y: [
        {value: '-=20', duration: 250, easing: 'easeOutSine', delay: 250 },
        {value: '+=20', duration: 250, easing: 'easeInSine', endDelay: 250 },
      ],
      loop: true,
    }).add({
      targets: this.L_foot,
      x: [
        {value: '+=20', duration: 250, easing: 'easeOutSine' },
        {value: '-=100', duration: 500, easing: 'linear' },
        {value: '+=80', duration: 250, easing: 'easeInSine' },
      ],
      y: [
        {value: '-=20', duration: 0, easing: 'linear' },
        {value: '+=20', duration: 250, easing: 'easeInSine', endDelay: 500 },
        {value: '-=20', duration: 250, easing: 'easeOutSine' },
      ],
    },0).add({
      targets: this.body,
      y: [
        {value: '-=20', duration: 0, easing: 'linear' },
        {value: '+=20', duration: 250, easing: 'easeInSine' },
        {value: '-=20', duration: 250, easing: 'easeOutSine' },
        {value: '+=20', duration: 250, easing: 'easeInSine' },
        {value: '-=20', duration: 250, easing: 'easeOutSine' },
      ],
    },0)
    return a;
  },
  //アニメーション：走行
  anime_run: function(){
    this.reset();
    var a = anime.timeline({
      targets: this.R_foot,
      x: [
        {value: '-=40', duration: 170, easing: 'linear' },
        {value: '+=120', duration: 260, easing: 'easeInOutSine' },
        {value: '-=80', duration: 170, easing: 'linear' },
      ],
      y: [
        {value: '-=15', duration: 0},
        {value: '-=15', duration: 130, easing: 'linear' },
        {value: '-=20', duration: 170, easing: 'easeOutSine' },
        {value: '+=50', duration: 170, easing: 'easeInSine' },
        {value: '-=15', duration: 130, easing: 'linear' },
      ],
      rotation: [
        {value: 15, duration: 0},
        {value: 30, duration: 130, easing: 'easeOutSine' },
        {value: -30, duration: 240, easing: 'easeOutSine' },
        {value: 0, duration: 100, easing: 'easeOutSine' },
        {value: 15, duration: 130, easing: 'linear' },
      ],
      loop: true,
    }).add({
      targets: this.L_foot,
      x: [
        {value: '+=20', duration: 170, easing: 'easeOutSine' },
        {value: '-=110', duration: 260, easing: 'linear' },
        {value: '+=90', duration: 170, easing: 'easeInSine' },
      ],
      y: [
        {value: '-=50', duration: 0, easing: 'linear' },
        {value: '+=50', duration: 170, easing: 'easeInSine' },
        {value: '-=30', duration: 260, easing: 'linear' },
        {value: '-=20', duration: 170, easing: 'easeOutSine' },
      ],
      rotation: [
        {value: -28, duration: 0},
        {value: -30, duration: 70, easing: 'easeOutSine' },
        {value: 0, duration: 100, easing: 'easeOutSine' },
        {value: 30, duration: 260, easing: 'easeOutSine' },
        {value: -28, duration: 170, easing: 'easeOutSine' },
      ],
    },0).add({
      targets: this.body,
      y: [
        {value: '-=20', duration: 0, easing: 'linear' },
        {value: '+=20', duration: 150, easing: 'easeInSine' },
        {value: '-=20', duration: 150, easing: 'easeOutSine' },
        {value: '+=20', duration: 150, easing: 'easeInSine' },
        {value: '-=20', duration: 150, easing: 'easeOutSine' },
      ],
    },0).add({
      targets: this.R_arm2,
      rotation: 15,
      duration: 0,
      endDelay: 600,
    },0).add({
      targets: this.L_arm2,
      rotation: 15,
      duration: 0,
      endDelay: 600,
    },0).add({
      targets: this.R_arm1,
      rotation: -30,
      duration: 0,
      endDelay: 600,
    },0).add({
      targets: this.L_arm1,
      rotation: -30,
      duration: 0,
      endDelay: 600,
    },0)
    return a;
  },
  //アニメーション：跳躍
  anime_jump: function(){
    this.reset();
    var a = anime.timeline({
      targets: this.R_foot,
      x: this.body.x-15+40,
      duration: 50,
      easing: 'easeOutSine',
      //loop: true,
    }).add({
      targets: this.L_foot,
      x: this.body.x+25+40,
      duration: 50,
      easing: 'easeOutSine',
    },0).add({
      targets: this.body,
      x: '+=40',
      y: '-=30',
      duration: 50,
      easing: 'easeOutSine',
    },0).add({
      targets: this.head,
      rotation: -20,
      duration: 50,
      easing: 'easeOutSine',
    },0)
    return a;
  },
  //アニメーション：防御
  anime_defense: function(){
    this.reset();
    var a = anime.timeline({
      targets: this.body,
      y: '+=40',
      rotation: -20,
      duration: 50,
      easing: 'easeOutSine',
    },0).add({
      targets: this.head,
      rotation: 10,
      duration: 50,
      easing: 'easeOutSine',
    },0).add({
      targets: this.R_arm2,
      rotation: -20,
      duration: 50,
      easing: 'easeOutSine',
    },0).add({
      targets: this.L_arm2,
      rotation: -20,
      duration: 50,
      easing: 'easeOutSine',
    },0).add({
      targets: this.R_arm1,
      rotation: -180,
      duration: 50,
      easing: 'easeOutSine',
    },0).add({
      targets: this.L_arm1,
      rotation: -180,
      duration: 50,
      easing: 'easeOutSine',
    },0)
    return a;
  },
  //アニメーション：特殊1
  anime_skill1: function(){
    this.reset();
    //自身と相手の座標と向きを獲得
    var mP = getCharaPosition(this.id);
    var eP = getCharaPosition(this.id+1);
    //x軸とy軸の差を算出
    var sa = {x:(eP.x-mP.x)*mP.d, y:mP.y-eP.y-120};
    //角度
    var r = 0;//-10;
    var ran = 360*anime.random(-1,1); //演出用
    //前方
    if(sa.x > 0) r += Math.atan(sa.y/sa.x)*180/Math.PI;
    //後方
    else if(sa.x < 0){
      if(sa.y >= 0) r += Math.atan(sa.y/sa.x)*180/Math.PI +180;// +200;
      else r += Math.atan(sa.y/sa.x)*180/Math.PI -180;//-160;
    }
    //上方
    else if(sa.y >= 0) r = 90;
    //下方
    else r = -90;
    console.log(r);
    //胴体の移動量 反動の演出用
    var x = -50*Math.cos(r/180*Math.PI);
    var y = 50*Math.sin(r/180*Math.PI);

    var a = anime.timeline({
      targets: this.body,
      x: [
        {value: function(p) { return p.x+x; }, duration: 1, easing: 'easeInOutSine', delay: 500 },
        {value: function(p) { return p.x; }, endDelay: 500, duration: 500, easing: 'easeInOutSine' },
      ],
      y: [
        {value: function(p) { return p.y+50; }, duration: 500, easing: 'easeInOutSine' },
        {value: function(p) { return p.y+50+y; }, duration: 1, easing: 'easeInOutSine' },
        {value: function(p) { return p.y+50; }, duration: 500, easing: 'easeInOutSine' },
        {value: function(p) { return p.y; }, duration: 500, easing: 'easeInOutSine' },
      ],
      complete: ()=> {
        this.attackNow = 0;
        this.moveNow = 0;
        this.canMove = true;
        this.changeAnime = true;
      }
    }).add({
      targets: this.R_arm2,
      rotation: [
        {value: -90-r+ran, duration: 500, easing: 'easeInOutSine'},
        {value: ran, delay: 500, duration: 500, easing: 'easeInOutSine'},
      ],
    },0).add({
      targets: this.L_arm2,
      rotation: [
        {value: -90-r+ran, duration: 500, easing: 'easeInOutSine'},
        {value: ran, delay: 500, duration: 500, easing: 'easeInOutSine'},
      ],
    },0).add({
      begin: ()=> { console.log("skill1 >> target ...") }
    },0).add({
      begin: ()=> {
        console.log("skill1 >> shot !!!");
        console.log(this.R_hand.rotation);
        if(chara[this.id].info.block[0][2] >= 1.0){
          chara[this.id].info.block[0][2] -= 1;
          Bullet1(mP.x+this.R_hand.x*mP.d, mP.y+this.R_hand.y, r, mP.d, this.id).addChildTo(layer1);
        }
        if(chara[this.id].info.block[0][2] >= 1.0){
          chara[this.id].info.block[0][2] -= 1;
          Bullet1(mP.x+this.L_hand.x*mP.d, mP.y+this.L_hand.y, r, mP.d, this.id).addChildTo(layer1);
        }
        chara[this.id].info.updateSkill();
      },
    },500);
    return a;
  },
  //アニメーション：特殊2
  anime_skill2: function(){
    this.reset();
    //自身と相手の座標と向きを獲得
    var mP = getCharaPosition(this.id);
    var eP = getCharaPosition(this.id+1);

    var a = anime.timeline({
      targets: this.body,
      y: [
        {value: '+=100', delay: 500, endDelay: 700, duration: 300, easing: 'easeInBack' },
        {value: '-=100', duration: 500, easing: 'easeInOutSine' },
      ],
      complete: ()=> {
        this.attackNow = 0;
        this.moveNow = 0;
        this.canMove = true;
        this.changeAnime = true;
      }
    }).add({
      targets: this.R_arm2,
      rotation: [
        {value: 45, endDelay: 1000, duration: 500, easing: 'easeOutBack'},
        {value: 0, duration: 500, easing: 'easeInBack'},
      ],
    },0).add({
      targets: this.L_arm2,
      rotation: [
        {value: -45, endDelay: 1000, duration: 500, easing: 'easeOutBack'},
        {value: 0, duration: 500, easing: 'easeInBack'},
      ],
    },0).add({
      targets: this.R_arm1,
      rotation: [
        {value: 350, endDelay: 1500, duration: 500, easing: 'easeOutSine'},
      ],
    },0).add({
      targets: this.L_arm1,
      rotation: [
        {value: -370, endDelay: 1500, duration: 500, easing: 'easeOutSine'},
      ],
    },0).add({
      targets: this.head,
      rotation: [
        {value: -20, duration: 500, easing: 'easeOutSine'},
        {value: 0, endDelay: 1200, duration: 300, easing: 'easeInBack'},
      ],
    },0).add({
      begin: ()=> { console.log("skill2 >> set ...") }
    },800).add({
      begin: ()=> {
        console.log("skill2 >> burn !!!");
        if(chara[this.id].info.block[1][2] >= 1.0){
          chara[this.id].info.block[1][2] -= 1;
          chara[this.id].info.updateSkill();
          Bullet2(eP.x, mP.y+this.height/2, this.id).addChildTo(layer1);
        }
      },
    },1000);
    return a;
  },
  //アニメーション：特殊3
  anime_skill3: function(){
    this.reset();
    //自身の座標と向きを獲得
    var mP = getCharaPosition(this.id);
    var b = Bullet3(mP.x+200*mP.d, mP.y, mP.d, this.id).addChildTo(layer1);
    var a = anime.timeline({
      targets: this.body,
      x: [
        {value: '-=30', duration: 1, easing: 'easeInOutSine', delay: 1500 },
        {value: '+=30', endDelay: 500, duration: 500, easing: 'easeInOutSine' },
      ],
      y: [
        {value: '+=50', endDelay: 2001, duration: 500, easing: 'easeInOutSine' },
        {value: '-=50', endDelay: 500, duration: 500, easing: 'easeInOutSine' },
      ],
      complete: ()=> {
        this.attackNow = 0;
        this.moveNow = 0;
        this.canMove = true;
        this.changeAnime = true;
      }
    }).add({
      targets: this.head,
      rotation: [
        {value: 0, duration: 500, easing: 'easeInOutSine'},
        {value: -20, duration: 1000, easing: 'easeInOutSine'},
        {value: -40, duration: 0, easing: 'easeOutSine'},
        {value: -20, duration: 1000, easing: 'easeInOutSine'},
        {value: 0, duration: 500, easing: 'easeInOutSine'},
      ],
    },0).add({
      targets: this.R_arm2,
      rotation: [
        {value: -20, endDelay: 1000, duration: 500, easing: 'easeInOutSine'},
        {value: 10, duration: 0, easing: 'easeInOutSine'},
        {value: -20, duration: 1000, easing: 'easeOutSine'},
        {value: 0, duration: 500, easing: 'easeOutSine'},
      ],
    },0).add({
      targets: this.L_arm2,
      rotation: [
        {value: -180, endDelay: 1000, duration: 500, easing: 'easeInOutSine'},
        {value: -210, duration: 0},
        {value: -180, duration: 1000, easing: 'easeOutSine'},
        {value: -360, duration: 500, easing: 'easeOutSine'},
      ],
    },0).add({
      targets: this.R_arm1,
      rotation: [
        {value: -100, duration: 500, easing: 'easeInOutSine'},
        {value: -80, endDelay: 1000, duration: 1000, easing: 'easeInSine'},
        {value: 0, duration: 500, easing: 'easeInOutSine'},
      ],
    },0).add({
      targets: this.L_arm1,
      rotation: [
        {value: -30, duration: 500, easing: 'easeInOutSine'},
        {value: -50, endDelay: 1000, duration: 1000, easing: 'easeInSine'},
        {value: -360, duration: 500, easing: 'easeOutSine'},
      ],
    },0).add({
      begin: ()=> {
        console.log("skill3 >> charge ...");
        b.appear = true;
      },
    },500).add({
      begin: ()=> {
        console.log("skill3 >> shot !!!");
        b.shot = true;
      },
    },1500);
    return a;
  },
  //アニメーション：負傷
  anime_delete: function(){
    this.reset();
    var a = anime.timeline({
      targets: this.body,
      x: '+=30',
      rotation: -30,
      duration: 50,
      easing: 'easeOutSine'
    }).add({
      targets: this.head,
      rotation: -30,
      duration: 50,
      easing: 'easeOutSine'
    },0).add({
      targets: this.R_arm2,
      rotation: 10,
      duration: 50,
      easing: 'easeOutSine'
    },0).add({
      targets: this.L_arm2,
      rotation: -70,
      duration: 50,
      easing: 'easeOutSine'
    },0).add({
      targets: this.R_arm1,
      rotation: 10,
      duration: 50,
      easing: 'easeOutSine'
    },0).add({
      targets: this.L_arm1,
      rotation: -70,
      duration: 50,
      easing: 'easeOutSine'
    },0).add({
      targets: this.L_foot,
      y: '-=50',
      rotation: -30,
      duration: 50,
      easing: 'easeOutSine'
    },0);
    return a;
  },
  //----------------------------------------------------------------//
  //調整：右手
  checkRightHand(match){
    var rad = this.R_arm1.rotation/180*Math.PI;
    var cos = Math.cos(rad);
    var sin = Math.sin(rad);
    var joint = {x:this.R_arm1.x-133*sin, y:this.R_arm1.y+133*cos};
    this.R_hand.setPosition(joint.x, joint.y);
    this.R_hand.rotation = this.R_arm1.rotation;
  },
  //調整：左手
  checkLeftHand(match){
    var rad = this.L_arm1.rotation/180*Math.PI;
    var cos = Math.cos(rad);
    var sin = Math.sin(rad);
    var joint = {x:this.L_arm1.x-133*sin, y:this.L_arm1.y+133*cos};
    this.L_hand.setPosition(joint.x, joint.y);
    this.L_hand.rotation = this.L_arm1.rotation;
  },
  //調整：右腕
  checkRightArm1(match){
    var rad = this.R_arm2.rotation/180*Math.PI;
    var cos = Math.cos(rad);
    var sin = Math.sin(rad);
    var joint = {x:this.R_arm2.x-129*sin, y:this.R_arm2.y+129*cos};
    this.R_arm1.setPosition(joint.x, joint.y);
    if(match) this.R_arm1.rotation = this.R_arm2.rotation;
    this.checkRightHand();
  },
  //調整：左腕
  checkLeftArm1(match){
    var rad = this.L_arm2.rotation/180*Math.PI;
    var cos = Math.cos(rad);
    var sin = Math.sin(rad);
    var joint = {x:this.L_arm2.x-129*sin, y:this.L_arm2.y+129*cos};
    this.L_arm1.setPosition(joint.x, joint.y);
    if(match) this.L_arm1.rotation = this.L_arm2.rotation;
    this.checkLeftHand();
  },
  //調整：右肩
  checkRightArm2(match){
    var rad = this.head.rotation/180*Math.PI;
    var cos = Math.cos(rad);
    var sin = Math.sin(rad);
    var joint = {x:this.head.x-37*cos+124*sin, y:this.head.y-124*cos-37*sin};
    this.R_arm2.setPosition(joint.x, joint.y);
  },
  //調整：左肩
  checkLeftArm2(match){
    var rad = this.head.rotation/180*Math.PI;
    var cos = Math.cos(rad);
    var sin = Math.sin(rad);
    var joint = {x:this.head.x+123*cos+124*sin, y:this.head.y-124*cos+123*sin};
    this.L_arm2.setPosition(joint.x, joint.y);
  },
  //調整：頭部
  checkHead(){
    var rad = this.body.rotation/180*Math.PI;
    var cos = Math.cos(rad);
    var sin = Math.sin(rad);
    var joint = {x:this.body.x+15*cos+53*sin, y:this.body.y-53*cos-15*sin};
    this.head.setPosition(joint.x, joint.y);
  },
  //調整：右脚
  checkRightLeg(){
    var joint1 = {x:this.body.x-15, y:this.body.y};
    var joint2 = {x:this.R_foot.x, y:this.R_foot.y};
    this.R_leg2.setPosition(joint1.x, joint1.y);
    this.R_leg1.setPosition(joint2.x, joint2.y);
    var x = joint1.x-joint2.x;
    var y = joint2.y-joint1.y;
    var length = Math.sqrt(x**2 + y**2)
    this.R_leg2.rotation = (-Math.acos((length**2+65**2-104**2)/(2*length*65)) +Math.atan(x/y)) /Math.PI*180;
    this.R_leg1.rotation = ( Math.acos((length**2-65**2+104**2)/(2*length*104))+Math.atan(x/y)) /Math.PI*180;
  },
  //調整：左脚
  checkLeftLeg(){
    var joint1 = {x:this.body.x+25, y:this.body.y-5};
    var joint2 = {x:this.L_foot.x, y:this.L_foot.y};
    this.L_leg2.setPosition(joint1.x, joint1.y);
    this.L_leg1.setPosition(joint2.x, joint2.y);
    var x = joint1.x-joint2.x;
    var y = joint2.y-joint1.y;
    var length = Math.sqrt(x**2 + y**2)
    this.L_leg2.rotation = (-Math.acos((length**2+78**2-100**2)/(2*length*78)) +Math.atan(x/y)) /Math.PI*180;
    this.L_leg1.rotation = ( Math.acos((length**2-78**2+100**2)/(2*length*100))+Math.atan(x/y)) /Math.PI*180;
  },
  //使用する関数を自動選択するAI
  progAST: function(){
    var n = 0;
    var myInfo = chara[this.id].info;
    var enInfo = chara[(this.id-1)%2].info;
    if(myInfo.hp > 600){
      if(!myInfo.block[2][2] && enInfo.block[3][2]) n = 5;
      else if(info.turn%2 == 0) n = 2;
      else n = 1;
    }else if(myInfo.hp > 300){
      if(!myInfo.block[2][2]) n = 5;
      else if(!myInfo.block[3][2]) n = 6;
      else if(info.turn%2 == 0) n = 2 + 2 * anime.random(0,1);
      else n = 1 + 2 * anime.random(0,1);
    }else{
      if(!myInfo.block[2][2]){
        if(enInfo.block[3][2]) n = 5;
        else n = 9;
      }else if(info.turn%2 == 0) n = 8;
      else n = 7;
    }
    return n;
  }
});

//================================================================//

//敵1が撃つ弾1
phina.define("Bullet1", {
  superClass: 'CircleShape',
  init: function(x, y, r, d, id) {
    this.superInit({
      radius: 20,
      x: x,
      y: y,
      fill: '#222222',
      stroke: '#000000',
      strokeWidth: 8,
      rotation: r,
      scaleX: d,
    });
    //速度
    this.v = 50;
    this.vx =  this.v * Math.cos(r*Math.PI/180) * d;
    this.vy = -this.v * Math.sin(r*Math.PI/180);
    //角度
    if(d>0) this.r = r;
    else this.r = 180-r;
    //box2dオブジェクト作成
    this.obj = CreateBullet(this.width, this.x, this.y, this.r, this.v, id, 1, 40);
  },
  update: function(){
    const xy = this.obj.body.GetPosition();
    this.x = xy.x*layer.world._scale;
    this.y = xy.y*layer.world._scale;
    this.rotation = this.obj.body.GetAngle() /Math.PI *180;
    //box2dオブジェクト消滅時に自身も削除
    if(this.obj.disappear == true){
      this.delete();
    }
  },
  delete: function(){
    // console.log('delete bullet 1');
    this.remove();
  }
});





//================================================================//

//敵1が撃つ弾2　衝撃波
phina.define("Bullet2", {
  superClass: 'Sprite',
  init: function(x, y, id) {
    //衝撃波1(自身)
    this.superInit('Shock1');
    this.setPosition(x,y);
    this.origin.set(0.5, 1);
    this.height = 0;
    this.width = 80;
    //衝撃波2(余波)
    this.sub = Sprite('Shock2').addChildTo(this);
    this.sub.setPosition(0,0);
    this.sub.origin.set(0.5, 1);
    this.sub.height = 0;
    this.sub.width = 80;
    //当たり判定
    this.obj = CreateSlash(74, 300, x, y-80, 1, 0, 'box', 2, id, 90);
    //出現と消滅のアニメーション
    anime.timeline({
      targets: this,
      height: [
        {value: 480, endDelay: 800, duration: 200, easing: 'easeOutCirc'},
      ],
      width: [
        {value: 0, delay: 100, duration: 900, easing: 'easeInOutSine'},
      ],
      alpha: [
        {value: 0, delay: 200, duration: 800, easing: 'linear'},
      ],
      complete: () => { this.delete(); },
    }).add({
      targets: this.sub,
      height: [
        {value: 80, duration: 200, easing: 'easeOutCirc'},
        {value: 0, duration: 800, easing: 'easeInSine'},
      ],
      width: [
        {value: 320, duration: 1000, easing: 'easeOutExpo'},
      ],
      alpha: [
        {value: 0, delay: 200, duration: 800, easing: 'linear'},
      ],
    },0).add({
      begin: () => { this.obj.delete(); },
    },200);
  },
  update: function(){
  },
  delete: function(){
    this.remove();
  },
});

//================================================================//

//敵1が撃つ弾3
phina.define("Bullet3", {
  superClass: 'DisplayElement',
  init: function(x, y, d, id) {
    this.id = id;
    this.superInit();
    this.x = x;
    this.y = y;
    //スプライト
    this.anim = CircleShape({
      radius: 150,
      fill: '#220022',
      stroke: '#000000',
      strokeWidth: 40,
      rotation: 0,
      scaleX: 0,
      scaleY: 0,
    }).addChildTo(this);

    //フラグ
    this.appear = false; //発生時
    this.shot = false; //発砲時
    //速度
    this.v = 40;//*d;
    //角度
    this.d = d;
    if(d>0) this.r = 0; //右
    else this.r = 180; //左
    //Box2dオブジェクト
    this.obj = null; //最初は描画しない
  },
  update: function(){
    //スプライトの座標更新
    if(this.obj){
      const xy = this.obj.body.GetPosition();
      this.x = xy.x*layer.world._scale;
      this.y = xy.y*layer.world._scale;
      this.rotation = this.obj.body.GetAngle() *180 /Math.PI;
    }
    //見た目は常に回転している
    this.anim.rotation += 25;
    //弾出現時
    if(this.appear){
      this.appear = false;
      this.anime_appear();
    }
    //弾発砲時
    if(this.shot){
      this.shot = false;
      this.obj = CreateBullet(this.anim.width, this.x, this.y, this.r, this.v, this.id, 1, 300, true);
      this.obj.remain = true;
    }
    //強制削除(10sec)
    if(this.disappear == true) this.delete();
  },
  delete: function(){
    this.remove();
  },
  anime_appear: function(){
    var a = anime({
      targets: this.anim,
      scaleX: this.d,
      scaleY: 1,
      duration: 1000,
      easing: 'easeOutSine',
    })
    return a;
  }
});



//================================================================//



//キャラクター描画クラス
phina.define("Character",{
  superClass: 'DisplayElement',
  init: function(id, anim, x) {
    //初期化
    this.superInit();
    //座標指定
    this.setPosition(x,480);
    //各種情報
    this.id = id; //識別番号
    this.player = false; //操作の可否
    this.ast = viewAST(id); //背景に描画する抽象構文木
    this.anim = anim.addChildTo(this); //描画するキャラクター
    this.info = CharaInfo(id, this.anim.hp, this.anim.block); //キャラクター情報の格納
    //サイズ
    this.width = this.anim.width;
    this.height = this.anim.height;
    //Box2Dオブジェクトの作成
    //Body定義と実装
    var scale = layer.world._scale;
    var size = {w:this.width/scale/2, h:this.height/scale/2};
    var bodyDef = new b2.BodyDef;
    bodyDef.type = 2; //dynamic
    bodyDef.fixedRotation = true; //外力による回転を無効
    bodyDef.position.Set(this.x/scale, this.y/scale);
    var body = layer.world.CreateBody(bodyDef);
    //Fixture定義と実装
    var fixtureDef = new b2.FixtureDef;
    fixtureDef.density = 1; //密度
    fixtureDef.friction = 0; //摩擦係数
    fixtureDef.restitution = 0;; //反発係数
    //ステージに対する当たり判定
    var shape = new b2.PolygonShape;
    shape.SetAsBox(size.w, size.h);
    fixtureDef.shape = shape;
    fixtureDef.userData = {
      name: 'Chara', //種類
      touchGround: false, //地面と接触中
      touchCeiling: false, //天井と接触中
      touchWall: false, //壁と接触中
      shototsu: false, //衝突した
    };
    fixtureDef.filter.groupIndex = -1 -id;
    fixtureDef.filter.categoryBits = C_Chara;
    fixtureDef.filter.maskBits = 0x0005;
    body.CreateFixture(fixtureDef);
    //攻撃に対する当たり判定
    fixtureDef.shape.SetAsBox(size.w*0.6, size.h*0.8);
    fixtureDef.userData = {
      name: 'Chara_Body', //種類
      shototsu: false, //衝突した
      damage: new Array(), //受けたダメージ
    };
    fixtureDef.filter.categoryBits = C_Body;
    fixtureDef.filter.maskBits = 0xffff;
    body.CreateFixture(fixtureDef);
    
    this.body = body;

    //行動に関係する変数
    this.velX = 0; //現在の速度
    this.maxSpeed = 4; //現在の最高速度
    this.maxSpeed1 = 4; //歩行時の最高速度
    this.maxSpeed2 = 8; //走行時の最高速度
    this.direction = 1; //向き
    this.sJump = false; //小ジャンプ
    this.dJump = false; //大ジャンプ
    this.onGround = 0; //上昇する時間
    this.touchGround = false; //地上にいる
    this.touchCeiling = false; //天井に接触中
    this.touchWall = false; //壁に接触中
    this.shototsu = false; //何かに衝突した
    //参照するプログラム
    this.astAll = null; //全情報
    this.astNow = null; //現在参照している1構文木
    //実行処理の開始条件
    this.howStart = () => {return false};
    //次の実行処理
    this.doCommand = () => {};
  },
  update: function(app){
    //待ち状態を判定
    if(this.howStart()){
      //参照している構文木が存在しない
      if(!this.astNow || this.astNow == "Nil"){
        //プログラムを破棄
        this.howStart = () => {return false};
        this.astNow = null; 
        this.info.condition.label.text = "行動終了";
      }else{
        //実行する処理の名前の表示を更新
        this.info.condition.label.text = this.rename(this.astNow.node.getBrickCommand, this.astNow.node.getBrickArgument.value);
        //実行処理をしたついでに次のブロックを参照する。
        this.changeASTRoots(this.doCommand());
      }
    }

    //スプライトの座標をBox2Dオブジェクトに合わせる
    const xy = this.body.GetPosition();
    const scale = layer.world._scale;
    this.x = xy.x*scale;
    this.y = xy.y*scale;
    this.rotation = this.body.GetAngle() *180 /Math.PI;
    //衝突フラグの確認
    const tg = this.body.GetFixtureList().GetNext().GetUserData().touchGround;
    const tc = this.body.GetFixtureList().GetNext().GetUserData().touchCeiling;
    const tw = this.body.GetFixtureList().GetNext().GetUserData().touchWall;
    //各衝突フラグ切り替え時の処理
    if(this.touchGround != tg){
      if(!this.touchGround){
        this.onGround = 10;
        this.sJump = false;
        this.dJump = false;
        this.anim.jumpNow = 0;
        this.anim.moveNow -= 2;
        this.anim.changeAnime = true;
      }else if(this.onGround == 10) this.onGround = 0;
      this.touchGround = tg;
    }
    if(this.touchCeiling != tc){
      if(!this.touchCeiling){
        sJump = false;
        dJump = false;
      }
      this.touchCeiling = tc;
    }
    //壁衝突時のフラグだけ何にも依存していない
    this.touchWall = tw;
    
    //スプライトの横方向への速度
    //移動可能かつ 歩行または走行状態
    if(this.anim.canMove && this.anim.moveNow>0){
      //最大速度を超えないように加速
      if(Math.abs(this.velX) < this.maxSpeed){
        this.velX += 1 * this.direction;
      }else this.velX = this.maxSpeed * this.direction;
    }
    //向きに応じてスプライトを左右反転
    this.scaleX = this.direction;
    //速度が0じゃない かつ 移動終了した
    if(this.velX != 0 && this.anim.moveNow <= 0){
      //徐々に減速
      if(this.velX > 0){
        this.velX -= 2;
        if(this.velX <= 0) this.velX = 0;
      }
      else{
        this.velX += 2;
        if(this.velX >= 0) this.velX = 0;
      }
    }

    //天井に衝突した
    if(this.touchCeiling){
      //上方向への加速を止める
      this.onGround = 0;
    }
    //動作中またはジャンプ中はBox2Dオブジェクトに内力を反映させる。
    if(this.anim.moveNow || this.anim.jumpNow) this.body.SetAwake(true);
    //Box2Dオブジェクトの横方向の速度
    this.body.SetLinearVelocity(new b2.Vec2(this.velX, this.body.GetLinearVelocity().y));
    //ジャンプ処理　ジャンプ命令あり かつ 地上にいる状態
    if((this.sJump || this.dJump) && this.onGround){
      // console.log("Jump !");
      this.body.SetAwake(true);
      //Box2Dオブジェクトの縦方向の速度
      this.body.SetLinearVelocity(new b2.Vec2(this.body.GetLinearVelocity().x, -15));
      this.sJump = false;
      this.onGround-=1;
    }

    //被ダメージ時の処理
    //ダメージを受けた数だけ処理
    while(this.body.GetFixtureList().GetUserData().damage.length){
      //1回分のダメージ
      const d = this.body.GetFixtureList().GetUserData().damage.shift();
      //敗北していない
      if(this.anim.attackNow < 90){
        //防御状態なら1ダメージに抑える
        if(this.anim.attackNow == 14) this.info.hp -= 1;
        //防御状態でないならそのままのダメージ量を体力から減らす
        else this.info.hp -= d;
        //体力が0以下になった場合
        if(this.info.hp <= 0){
          this.info.hp = 0; //hpの最低値は0
          //プログラム読み取りを中断
          this.astNow = null;
          this.howStart = () => {return false};
          this.doCommand = () => {};
          //アニメーション状態を敗北に変更
          this.anim.moveNow = -1;
          this.anim.attackNow = 90;
          this.anim.changeAnime = true;
        }
        //表示している体力を更新
        this.info.updateHp();
      }
    }

    // 直前に衝突した というフラグをリセットする
    this.body.GetFixtureList().GetUserData().shototsu = false;
    this.body.GetFixtureList().GetNext().GetUserData().shototsu = false;
  },
  //非操作キャラクターの使用するプログラムを獲得
  autoGetAST: function(){
    var n = this.anim.progAST(); //関数番号を獲得
    this.astAll = [n]; //最初に参照する関数の番号を配列の頭に格納
    this.astAll.push(JSON.parse(this.anim.autoProg)); //プログラム全体を格納
    // console.log(this.astAll);
    this.getASTRoots(n); //最初に参照する関数のプログラムを格納
    this.ast.putASTxy(this.astNow); //背景に描画する抽象構文木を更新
    this.info.condition.label.text = "準備完了"; //準備完了
    // console.log(this.astNow);
  },
  //プログラム全体から任意の関数番号の抽象構文木を獲得する。
  getASTRoots: function(num){
    if(!this.astAll) return;
    var ast = this.astAll[1];
    //読み込む前に初期化してしまう
    this.astNow = null;
    //対象の関数を読み込む
    for(var i=0; i<ast.length; i++){
      var node = ast[i].ASTne.node;
      if(node.getBrickCommand == "CommandFuncStart" && node.getBrickArgument.value == num){
        this.astNow = ast[i].ASTne;
        break;
      }
    }
    //ついでに描画する構文木情報を更新
    this.ast.putASTxy(this.astNow);
    return;
  },
  //次のブロックを根とする構文木情報を格納する
  changeASTRoots: function(n){
    //次のブロックを格納
    if(n == 1) this.astNow = this.astNow.right;
    else if(n == 2) this.astNow = this.astNow.bottom;
    else if(this.astNow.right == "Nil" ^ this.astNow.bottom == "Nil"){
      if(this.astNow.right != "Nil") this.astNow = this.astNow.right;
      else this.astNow = this.astNow.bottom;
    }else this.astNow = "Nil";
    //開始条件と実行処理を初期化する関数
    const trash = () => {
      this.howStart = () => {return true}; //すぐに実行処理を行う
      this.doCommand = () => {}; //実行処理は何もない 次のブロックを参照する
    };
    //次の開始条件と実行処理を格納
    if(this.astNow == "Nil") trash();
    else{
      switch(this.astNow.node.getBrickType){
        case "EntryBrick": //関数nを開始
          if(this.astNow,node.getBrickCommand == "CommandFuncStart"){
            this.howStart = () => {return true};
            this.doCommand = () => {};
          }else trash();
          break;
        case "BasicBrick":
          switch(this.astNow.node.getBrickCommand){
            case "CommandAF": //スキル1
              if(this.anim.onGround[0]){
                this.howStart = () => {return (!this.anim.attackNow && !this.anim.jumpNow)};
                this.doCommand = () => {this.anim.moveNow = 0; this.anim.attackNow = 1; this.anim.changeAnime = true};
              }else{
                this.howStart = () => {return !this.anim.attackNow}
                this.doCommand = () => {this.anim.attackNow = 1; this.anim.changeAnime = true};
              }
              break;
            case "CommandAS": //スキル2
              if(this.anim.onGround[1]){
                this.howStart = () => {return (!this.anim.attackNow && !this.anim.jumpNow)};
                this.doCommand = () => {this.anim.moveNow = 0; this.anim.attackNow = 2; this.anim.changeAnime = true};
              }else{
                this.howStart = () => {return !this.anim.attackNow}
                this.doCommand = () => {this.anim.attackNow = 2; this.anim.changeAnime = true};
              }
              break;
            case "CommandMS": //立ち止まる
              this.howStart = () => {return (this.anim.canMove == true)};
              this.doCommand = () => {this.anim.moveNow = 0; this.anim.changeAnime = true};
              break;
            case "CommandMW": //前方に歩く
              this.howStart = () => {return　(this.anim.canMove == true)};
              this.doCommand = () => {this.maxSpeed = this.maxSpeed1; this.anim.moveNow = 1; this.anim.changeAnime = true};
              break;
            case "CommandMR": //前方に走る
              this.howStart = () => {return (this.anim.canMove == true)};
              this.doCommand = () => {this.maxSpeed = this.maxSpeed2; this.anim.moveNow = 2; this.anim.changeAnime = true};
              break;
            case "CommandMLJ": //小ジャンプ
              this.howStart = () => {return (this.anim.canMove == true && this.anim.jumpNow == 0)};
              this.doCommand = () => {this.anim.jumpNow = 1; this.sJump = true; this.anim.changeAnime = true};
              break;
            case "CommandMDJ": //大ジャンプ
              this.howStart = () => {return (this.anim.canMove == true && this.anim.jumpNow == 0)};
              this.doCommand = () => {this.anim.jumpNow = 1; this.dJump = true; this.anim.changeAnime = true};
              break;
            case "CommandMT": //向きを変える
              this.howStart = () => {return (this.anim.canMove == true)};
              this.doCommand = () => {this.direction *= -1};
              break;
            case "CommandML": //相手の方を向く
              this.howStart = () => {return (this.anim.canMove == true)};
              this.doCommand = () => {if(getCharaPosition(this.id+1).x-getCharaPosition(this.id).x > 0) this.direction=1; else this.direction=-1};
              break;
            case "CommandNone": //何もしない
              this.howStart = () => {return true};
              this.doCommand = () => {};
              break;
            default:
              trash();
              break;
          }
          break;
        case "TailBrick":
          switch(this.astNow.node.getBrickCommand){
            case "CommandAT": //スキル3
              if(this.anim.onGround[2]){
                this.howStart = () => {return (!this.anim.attackNow && !this.anim.jumpNow)};
                this.doCommand = () => {this.anim.moveNow = 0; this.anim.attackNow = 3; this.anim.changeAnime = true};
              }else{
                this.howStart = () => {return !this.anim.attackNow}
                this.doCommand = () => {this.anim.attackNow = 3; this.anim.changeAnime = true};
              }
              break;
            case "CommandAD": //防御する
              if(this.anim.onGround[3]) this.howStart = () => {return (!this.anim.attackNow && !this.anim.jumpNow)};
              else this.howStart = () => {return !this.anim.attackNow}
              this.doCommand = () => {this.anim.moveNow = 0; this.anim.attackNow = 4; this.anim.changeAnime = true};
              break;
            case "CommandFuncStop": //関数nへ移動
              this.howStart = () => {return true};
              this.doCommand = () => {this.getASTRoots(this.astNow.node.getBrickArgument.value)};
              break;
            case "CommandReboot": //関数繰り返し
              this.howStart = () => {return true};
              this.doCommand = () => {this.getASTRoots(this.astNow.node.getBrickTab+1)};
              break;
            default:
              trash();
              break;
          }
          break;
        case "CaseBrick":
          trash();
          switch(this.astNow.node.getBrickCommand){
            case "CommandSM": //待機：移動終了
              var v = this.body.GetLinearVelocity();
              this.howStart = () => {return (this.anim.jumpNow==0 && Math.abs(v.x) < 0.1)};
              this.info.condition.label.text = this.rename(this.astNow.node.getBrickCommand, this.astNow.node.getBrickArgument.value);
              break;
            case "CommandSA": //待機：攻撃終了
              this.howStart = () => {return (this.anim.attackNow == 0)};
              this.info.condition.label.text = this.rename(this.astNow.node.getBrickCommand, this.astNow.node.getBrickArgument.value);
              break;
            case "CommandSO": //待機：着地
              this.howStart = () => {return (this.anim.jumpNow == 0)};
              this.info.condition.label.text = this.rename(this.astNow.node.getBrickCommand, this.astNow.node.getBrickArgument.value);
              break;
            case "CommandSC": //待機：衝突
              this.howStart = () => {return (this.body.GetFixtureList().GetUserData().shototsu || this.body.GetFixtureList().GetNext().GetUserData().shototsu)};
              this.info.condition.label.text = this.rename(this.astNow.node.getBrickCommand, this.astNow.node.getBrickArgument.value);
              break;
            case "CommandSP": //待機：時間経過
              this.howStart = () => {return false};
              var c = Math.min(this.astNow.node.getBrickArgument.value*1000, info.counter);
              if(this.id == 0) window.setTimeout( function(){chara[0].howStart = () => {return true}}, c);
              if(this.id == 1) window.setTimeout( function(){chara[1].howStart = () => {return true}}, c);
              this.info.condition.label.text = this.rename(this.astNow.node.getBrickCommand, this.astNow.node.getBrickArgument.value);
              break;
            case "CommandSD": //待機：ダメージ
              this.howStart = () => {return (this.body.GetFixtureList().GetUserData().damage.length)};
              this.info.condition.label.text = this.rename(this.astNow.node.getBrickCommand, this.astNow.node.getBrickArgument.value);
              break;
            case "CommandCEM": //相手が移動中
              this.doCommand = () => {if(chara[(this.id+1)%2].anim.moveNow>0 && chara[(this.id+1)%2].anim.jumpNow>0) return 1; return 2};
              break;
            case "CommandCEA": //相手が攻撃中
              this.doCommand = () => {if(chara[(this.id+1)%2].anim.attackNow%10>0 && chara[(this.id+1)%2].anim.attackNow%10<4) return 1; return 2};
              break;
            case "CommandCED": //相手が防御中
              this.doCommand = () => {if(chara[(this.id+1)%2].anim.attackNow%10==4) return 1; return 2};
              break;
            case "CommandCEO": //相手が地上にいる
              this.doCommand = () => {if(chara[(this.id+1)%2].anim.jumpNow==0) return 1; return 2};
              break;
            case "CommandCEC": //相手が近い
              this.doCommand = () => {if(Math.abs(getCharaPosition(this.id+1).x-getCharaPosition(this.id).x)-(chara[0].width+chara[1].width)/2 <= this.astNow.node.getBrickArgument.value*120) return 1; return 2};
              break;
            case "CommandCEF": //相手が遠い
              this.doCommand = () => {if(Math.abs(getCharaPosition(this.id+1).x-getCharaPosition(this.id).x)-(chara[0].width+chara[1].width)/2 >= this.astNow.node.getBrickArgument.value*120) return 1; return 2};
              break;
            case "CommandCMH": //自身の体力参照
              this.doCommand = () => {if(this.info.hp <= this.astNow.node.getBrickArgument.value) return 1; return 2};
              break;
            case "CommandCEH": //相手の体力参照
              this.doCommand = () => {if(chara[(this.id+1)%2].info.hp <= this.astNow.node.getBrickArgument.value) return 1; return 2};
              break;
            default:
              break;
          }
          break;
        default:
          trash();
          break; 
      }
      
    }
  },
  //BrickCommandを日本語に翻訳する　表示用
  rename: function(c, n){
    switch(c){
      case "CommandAF": return "スキル1"
      case "CommandAS": return "スキル2"
      case "CommandMS": return "立ち止まる"
      case "CommandMW": return "前方に歩く"
      case "CommandMR": return "前方に走る"
      case "CommandMLJ": return "小ジャンプ"
      case "CommandMDJ": return "大ジャンプ"
      case "CommandMT": return "向きを変える"
      case "CommandML": return "相手の方を向く"
      case "CommandNone": return "なにもしない"
      case "CommandAT": return "スキル3"
      case "CommandAD": return "防御する"
      case "CommandFuncStop": return "関数移動"
      case "CommandReboot": return "関数繰り返し"
      case "CommandSM": return "待機：移動終了"
      case "CommandSA": return "待機：攻撃終了"
      case "CommandSO": return "待機：着地"
      case "CommandSC": return "待機：衝突"
      case "CommandSP": return "待機：" + n + "秒経過"
      case "CommandSD": return "待機：ダメージ"
      case "CommandCEM": return "相手が移動中?"
      case "CommandCEA": return "相手が攻撃中?"
      case "CommandCED": return "相手が防御中?"
      case "CommandCEO": return "相手が地上にいる?"
      case "CommandCEC": return "相手が" + n + "マス近い"
      case "CommandCEF": return "相手が" + n + "マス遠い"
      case "CommandCMH": return "自身の体力" + n + "以下"
      case "CommandCEH": return "相手の体力" + n + "以下"
      default: return ""
    }
  },
})

//================================================================//

//ステージ枠に描画するキャラクター情報
phina.define("CharaInfo", {
  superClass: "DisplayElement",
  init: function(id, hp, block){
    this.superInit();
    this.origin.set(0,0);
    this.id = id;
    this.hp = hp;
    this.hpmax = hp;
    this.block = block;

    //準備中,準備完了,行動中,行動終了の文字表示
    //その土台
    this.condition = RectangleShape({
      x: 120*(3+10*id),             // x座標
      y: 120*8.5,             // y座標
      width: 200,         // 横サイズ
      height: 80,        // 縦サイズ
      cornerRadius: 1,   // 角丸み
      fill: '#dddddd',    // 色
      stroke: 'black',     // 枠色
      strokeWidth: 4,     // 枠太さ
    }).addChildTo(this);
    //そのテキスト
    this.condition.label = Label({
      text: "準備中",     // 表示文字
      fontSize: 28,       // 文字サイズ
      fontColor: '#000000', // 文字色
      align: "center",
      baseline: "middle",
    }).addChildTo(this.condition);

    //体力とゲージの描画
    this.draw_hp = {};
    //ゲージ外部
    this.draw_hp.outGauge = RectangleShape({
      x: 120*(1.95+12.1*id),             // x座標
      y: 120*0.3,             // y座標
      width: 550,         // 横サイズ
      height: 30,        // 縦サイズ
      cornerRadius: 1,   // 角丸み
      fill: '#000000',    // 色
      stroke: 'black',     // 枠色
      strokeWidth: 5,     // 枠太さ
    }).addChildTo(this);
    this.draw_hp.outGauge.origin.set(id,0.5);
    //ゲージ内部
    this.draw_hp.inGauge = RectangleShape({
      x: 0,             // x座標
      y: 0,             // y座標
      width: 550,         // 横サイズ
      height: 30,        // 縦サイズ
      cornerRadius: 1,   // 角丸み
      fill: '#dddd00',    // 色
      stroke: 'black',     // 枠色
      strokeWidth: 5,     // 枠太さ
    }).addChildTo(this.draw_hp.outGauge);
    this.draw_hp.inGauge.origin.set(id,0.5);
    //土台
    this.draw_hp.box = RectangleShape({
      x: 120*(1+14*id),             // x座標
      y: 120*0.5,             // y座標
      width: 236,         // 横サイズ
      height: 116,        // 縦サイズ
      cornerRadius: 1,   // 角丸み
      fill: '#dddddd',    // 色
      stroke: 'black',     // 枠色
      strokeWidth: 5,     // 枠太さ
    }).addChildTo(this);
    //数値
    this.draw_hp.label = Label({
      text: "500",     // 表示文字
      fontSize: 40,       // 文字サイズ
      fontColor: '#000000', // 文字色
      align: "center",
      baseline: "middle",
    }).addChildTo(this.draw_hp.box);

    //固有スキル情報
    this.skill = {};
    //外枠
    this.skill.box = [];
    this.skill.box[0] = RectangleShape({
      x: 120*(0.5+15*id),             // x座標
      y: 120*3.5,             // y座標
      width: 116,         // 横サイズ
      height: 116,        // 縦サイズ
      cornerRadius: 1,   // 角丸み
      fill: 'yellow',    // 色
      stroke: 'black',     // 枠色
      strokeWidth: 5,     // 枠太さ
    }).addChildTo(this);
    this.skill.box[0].on('pointover', function() {
      console.log("pointover1");
    });
    this.skill.box[1] = RectangleShape({
      x: 120*(0.5+15*id),             // x座標
      y: 120*4.5,             // y座標
      width: 116,         // 横サイズ
      height: 116,        // 縦サイズ
      cornerRadius: 1,   // 角丸み
      fill: 'yellow',    // 色
      stroke: 'black',     // 枠色
      strokeWidth: 5,     // 枠太さ
    }).addChildTo(this);
    this.skill.box[2] = RectangleShape({
      x: 120*(0.5+15*id),             // x座標
      y: 120*5.5,             // y座標
      width: 116,         // 横サイズ
      height: 116,        // 縦サイズ
      cornerRadius: 1,   // 角丸み
      fill: 'pink',    // 色
      stroke: 'black',     // 枠色
      strokeWidth: 5,     // 枠太さ
    }).addChildTo(this);
    this.skill.box[3] = RectangleShape({
      x: 120*(0.5+15*id),             // x座標
      y: 120*6.5,             // y座標
      width: 116,         // 横サイズ
      height: 116,        // 縦サイズ
      cornerRadius: 1,   // 角丸み
      fill: 'pink',    // 色
      stroke: 'black',     // 枠色
      strokeWidth: 5,     // 枠太さ
    }).addChildTo(this);
    //テキスト
    this.skill.label = [];
    this.skill.label[0] = Label({
      text: "スキル1",
      fontSize: 28,       // 文字サイズ
      fontColor: '#000000', // 文字色
      align: "center",
      baseline: "middle",
    }).addChildTo(this.skill.box[0]);
    this.skill.label[0].on('pointover', function() {
      console.log("pointover2");
    });
    this.skill.label[1] = Label({
      text: "スキル2",
      fontSize: 28,       // 文字サイズ
      fontColor: '#000000', // 文字色
      align: "center",
      baseline: "middle",
    }).addChildTo(this.skill.box[1]);
    this.skill.label[2] = Label({
      text: "スキル3",
      fontSize: 28,       // 文字サイズ
      fontColor: '#000000', // 文字色
      align: "center",
      baseline: "middle",
    }).addChildTo(this.skill.box[2]);
    this.skill.label[3] = Label({
      text: "防御",
      fontSize: 28,       // 文字サイズ
      fontColor: '#000000', // 文字色
      align: "center",
      baseline: "middle",
    }).addChildTo(this.skill.box[3]);
    //表示する文字の固定(?)
    this.skill.fixLabel = [];
    for(var i=0; i<this.block.length; i++){
      switch(this.block[i][0]){
        case "C":
          this.skill.fixLabel[i] = this.skill.label[i].text + "\nターン";
          break;
        case "B":
          this.skill.fixLabel[i] = this.skill.label[i].text + "\n弾数";
          break;
        case "A":
        default:
          this.skill.fixLabel[i] = this.skill.label[i].text;
          break;
      }
    }

    this.updateHp();
    this.updateSkill();
    
  },
  update: function(){
  },
  updateHp: function(){
    //情報更新
    this.draw_hp.inGauge.scaleX = this.hp / this.hpmax;
    this.draw_hp.label.text = "" + this.hp;
  },
  updateSkill: function(){
    for(var i=0; i<4; i++){
      var a = this.block[i][2];
      //undefinedを削除
      if(!a && a != 0) a = "";
      else a = parseInt(a);
      //文字の更新
      this.skill.label[i].text = this.skill.fixLabel[i] + a;
      //色の更新
      var c;
      if(i > 1) c = 'pink';
      else c = 'yellow';
      switch(this.block[i][0]){
        case "C":
          if(this.block[i][2] == 0) this.skill.box[i].fill = c;
          else this.skill.box[i].fill = '#bbbbbb';
          break;
        case "B":
          if(this.block[i][2] >= 1) this.skill.box[i].fill = c;
          else this.skill.box[i].fill = '#bbbbbb';
          break;
        case "A":
        default:
          break;
      }
    }
  },
  recoverySkill: function(){
    for(var i=0; i<this.block.length; i++){
      switch(this.block[i][0]){
        case "C":
          if(this.block[i][2] > 0) this.block[i][2] -= this.block[i][3];
          break;
        case "B":
          this.block[i][2] += this.block[i][3];
          if(this.block[i][2] > this.block[i][1]) this.block[i][2] = this.block[i][1];
          break;
        case "A":
        default:
          break;
      }
    }
    this.updateSkill();
  },

})



//================================================================//



//1直線に移動する弾(円形)の当たり判定を描画
//直径[px]、x座標[px]、y座標[px]、角度[deg](右方向が0°上方向が90°)、速度、識別番号(0 or 1)、軌道、与ダメージ、必殺技(T/F)
//type == 0:落下する、1:直線軌道
phina.define("CreateBullet", {
  superClass: "DisplayElement",
  init: function(size, x, y, r, v, id, type, damage, strong) {
    //初期化
    this.superInit({
      width: size, //横幅
      height: size, //縦幅
    })
    this.setPosition(x,y); //座標
    this.origin.set(0.5,0.5); //基点
    
    //当たり判定詳細
    var scale = layer.world._scale; //1mの長さ[px]
    var size = this.width/scale/2; //直径[m]
    //Body定義
    var bodyDef = new b2.BodyDef; //BodyDef
    bodyDef.type = 2; //dynamic
    bodyDef.position.Set(this.x/scale, this.y/scale); //座標
    this.body = layer.world.CreateBody(bodyDef); //Bodyを物理世界に追加
    //Fixture定義
    var fixtureDef = new b2.FixtureDef(); //FixtureDef
    fixtureDef.density = 1; //密度
    fixtureDef.friction = 0; //摩擦係数
    fixtureDef.restitution = 0; //反発係数
    fixtureDef.userData = {
      name: 'Bullet', //種類 弾
      damage: damage, //与えるダメージ
      strength: damage, //弾の強さ
    }; //固有情報 衝突判定時に利用
    if(strong) fixtureDef.userData.strength += 50000; //必殺技補正
    fixtureDef.filter.groupIndex = -1 -id; //グループ値
    fixtureDef.filter.categoryBits = C_Bullet; //カテゴリー値
    fixtureDef.filter.maskBits = 0xfffc; //マスク値
    fixtureDef.shape = new b2.CircleShape(size); //円形のオブジェクト作成
    this.body.CreateFixture(fixtureDef); //Fixtureを作成してBodyに適用
    //速度
    this.v = v //引数より
    //角度
    var angle = r/180*Math.PI; //degをradに変換
    this.body.SetAngle(angle); //Bodyの角度変更
    this.axis = new b2.Vec2(1, 0); //弾のベクトル 右方向が基準
    this.axis.MulM(Box2D.Common.Math.b2Mat22.FromAngle(-angle)); //弾のベクトル計算
    
    this.joint = null;
    switch(type){
      case 1:
        //直動ジョイント定義
        var jointDef = new Box2D.Dynamics.Joints.b2PrismaticJointDef(); //定義
        jointDef.Initialize( //初期化
          layer.world.GetGroundBody(), //物理世界と
          this.body, //このBodyを結びつけ
          this.body.GetWorldCenter(), //このBodyの座標(初期位置)を基点に
          this.axis //弾のベクトルの向きに進む
        );
        jointDef.enableLimit = true; //移動制限の適用
        jointDef.lowerTranslation = 0.0; //負の方向に0[m]進める
        jointDef.upperTranslation = 50.0; //正の方向に50[m]進める
        jointDef.enableMotor = true; //モーターの適用
        jointDef.motorSpeed = this.v; //最大速度はv(引数)
        jointDef.maxMotorForce = 5000000; //大きな力を加えて等速度にする
        //直動ジョイントの適用
        this.joint = layer.world.CreateJoint(jointDef);
        break;
      case 0:
      default:
        //初速度
        this.body.SetLinearVelocity(new b2.Vec2(this.axis.x*this.v, this.axis.y*this.v));
        break;
    }

    //10s後は強制的に削除
    anime({
      targets: this,
      duration: 10000,
      complete: () => { this.delete(); },
    })
    
    //消滅完了フラグ
    this.disappear = false;
    //描画継続フラグ 衝突時にfixtureだけ削除するならtrue
    this.remain = false;
    //stage上に描画
    this.addChildTo(layer1);
  },
  update: function(){
    //衝突時
    if(this.body.GetFixtureList() && this.body.GetFixtureList().GetUserData().hit){
      this.body.GetFixtureList().GetUserData().hit = false; //フラグを解除
      if(this.body.GetFixtureList().GetUserData().strength <= 0){
        this.body.DestroyFixture(this.body.GetFixtureList()); //Fixtureを削除
        if(this.joint) layer.world.DestroyJoint(this.joint); //Jointを削除
        if(this.remain){
          this.body.SetType(1); //タイプをkinematicに変更 もう衝突しないため
          //衝突時の減速を無視して速度を設定
          this.body.SetLinearVelocity(new b2.Vec2(this.axis.x*this.v, this.axis.y*this.v))
        }else this.delete(); //このクラスを削除
      }
    }
  },
  delete: function(){
    //Jointが残っていたら削除
    if(this.body.GetJointList()) layer.world.DestroyJoint(this.joint);
    layer.world.DestroyBody(this.body); //Bodyを削除
    this.remove(); //このクラス要素を削除
    this.disappear = true; //削除完了フラグ
  }
})

//================================================================//

//円形の爆風の当たり判定を描画
phina.define("CreateBlast", {
  superClass: "DisplayElement",
  init: function(size, x, y, id, damage, strong) {
    this.superInit({
      width: size,
      height: size,
    });
    this.setPosition(x,y);
    this.origin.set(0.5,0.5);

    //当たり判定詳細
    var scale = layer.world._scale; //1mの長さ[px]
    this.size = this.width/scale/2; //直径[m]
    //Body定義
    var bodyDef = new b2.BodyDef; //BodyDef
    bodyDef.type = 1; //kinematic 爆風は他の爆風やステージと衝突しない
    bodyDef.position.Set(this.x/scale, this.y/scale); //座標
    this.body = layer.world.CreateBody(bodyDef); //Bodyを物理世界に追加
    //Fixture定義
    var fixtureDef = new b2.FixtureDef(); //FixtureDef
    fixtureDef.density = 1; //密度
    fixtureDef.friction = 0; //摩擦係数
    fixtureDef.restitution = 0; //反発係数
    fixtureDef.userData = {
      name: 'Bullet',
      damage: damage,
      strength: damage*10,
    }; //固有情報 衝突判定時に利用
    if(strong) fixtureDef.userData.strength += 50000; //必殺技補正
    fixtureDef.filter.groupIndex = -1 -id; //グループ値
    fixtureDef.filter.categoryBits = C_Bullet; //カテゴリー値
    fixtureDef.filter.maskBits = C_Body + C_Bullet; //マスク値
    fixtureDef.shape = new b2.CircleShape(0); //円形のオブジェクト作成
    this.body.CreateFixture(fixtureDef); //Fixtureを作成してBodyに適用
    
    //200ms後は強制的に削除
    this.shape = this.body.GetFixtureList().GetShape();
    anime({
      targets: this.shape,
      m_radius: this.size,
      easing: 'easeOutSine',
      duration: 200,
      complete: () => { this.delete(); },
    })

    this.addChildTo(layer1);
  },
  update: function(){
    if(this.body.GetFixtureList().GetUserData().strength <= 0){
      this.delete();
    }
  },
  delete: function(){
    layer.world.DestroyBody(this.body); //Bodyを削除
    this.remove(); //このクラス要素を削除
    this.disappear = true; //削除完了フラグ
  }
})

//================================================================//

//矩形の斬撃の当たり判定を描画
//横幅[px]、縦幅[px]、x座標[px]、y座標[px]、向き(-1or1)、角度[deg]
//形状('box' or 'tri' or 定義)、出現方法(0~4)、識別番号
//出現方法 == 0:中心から、1:左から右、2:下から上、3:右から左、4:上から下
//出現方法 == 5:左下から右上、6:右下から左上、7:右上から左下、8:左上から右下
phina.define("CreateSlash", {
  superClass: "DisplayElement",
  init: function(w, h, x, y, d, r, shape, type, id, damage, strong) {
    this.superInit({
      width: w,
      height: h,
    });
    this.setPosition(x,y);
    this.origin.set(0.5,0.5); //これ意味ない

    
    //当たり判定詳細
    var scale = layer.world._scale; //1mの長さ[px]
    var pos = {x:this.x/scale, y:this.y/scale}; //座標[m]
    this.size = {w:w/scale/2, h:h/scale/2}; //サイズ[m]

    //形状と各点の調整
    this.shape = new b2.PolygonShape(); //円形のオブジェクト作成
    //形状の作成または適用
    switch(shape){
      case 'box' : //長方形
        this.shape.SetAsBox(this.size.w, this.size.h);
        break;
      case 'tri' : //三角形 右向き▷
        var vertices = new Array();
        vertices.push(new b2.Vec2(-this.size.w, -this.size.h));
        vertices.push(new b2.Vec2( this.size.w, 0));
        vertices.push(new b2.Vec2(-this.size.w, this.size.h));
        this.shape.SetAsVector(vertices, 3);
      default :
        this.shape = shape;
    }
    //座標修正
    try{
      //基準に合わせて座標を修正
      switch(type){
        case 1:
          for(var i=0; i<this.shape.m_vertices.length; i++){
            this.shape.m_vertices[i].x += this.size.w;
          }
          break;
        case 2:
          for(var i=0; i<this.shape.m_vertices.length; i++){
            this.shape.m_vertices[i].y -= this.size.h;
          }
          break;
        case 3:
          for(var i=0; i<this.shape.m_vertices.length; i++){
            this.shape.m_vertices[i].x -= this.size.w;
          }
          break;
        case 4:
          for(var i=0; i<this.shape.m_vertices.length; i++){
            this.shape.m_vertices[i].y += this.size.h;
          }
          break;
        case 5:
          for(var i=0; i<this.shape.m_vertices.length; i++){
            this.shape.m_vertices[i].x += this.size.w;
            this.shape.m_vertices[i].y -= this.size.h;
          }
          break;
        case 6:
          for(var i=0; i<this.shape.m_vertices.length; i++){
            this.shape.m_vertices[i].x -= this.size.w;
            this.shape.m_vertices[i].y -= this.size.h;
          }
          break;
        case 7:
          for(var i=0; i<this.shape.m_vertices.length; i++){
            this.shape.m_vertices[i].x -= this.size.w;
            this.shape.m_vertices[i].y += this.size.h;
          }
          break;
        case 8:
          for(var i=0; i<this.shape.m_vertices.length; i++){
            this.shape.m_vertices[i].x += this.size.w;
            this.shape.m_vertices[i].y += this.size.h;
          }
          break;
        default:
          break;
      }
      //必要なら反転
      if(d < 0){
        console.log("derection ?");
        for(var i=0; i<this.shape.m_vertices.length; i++){
          //各点のx方向を反転
          this.shape.m_vertices[i].x *= -1;
          //各辺の法線ベクトルのx方向を反転
          this.shape.m_normals[i].x *= -1;
        }
      }
    }catch(e){
      //妥協案 というか意味ない デバッグ用
      this.shape = new b2.CircleShape(2);
    }

    //Body定義
    var bodyDef = new b2.BodyDef; //BodyDef
    // bodyDef.type = 2; //dynamic
    bodyDef.type = 1; //kinematic　他の斬撃、爆風、ステージと衝突しない
    bodyDef.position.Set(this.x/scale, this.y/scale); //座標
    bodyDef.fixedRotation = true; //勝手に回転しない
    this.body = layer.world.CreateBody(bodyDef); //Bodyを物理世界に追加
    //Fixture定義
    var fixtureDef = new b2.FixtureDef(); //FixtureDef
    fixtureDef.density = 1; //密度
    fixtureDef.friction = 0; //摩擦係数
    fixtureDef.restitution = 0; //反発係数
    fixtureDef.userData = {
      name: 'Bullet',
      damage: damage,
      strength: damage*10,
    }; //固有情報 衝突判定時に利用
    if(strong) fixtureDef.userData.strength += 50000; //必殺技補正
    fixtureDef.filter.groupIndex = -1 -id; //グループ値
    fixtureDef.filter.categoryBits = C_Bullet; //カテゴリー値
    fixtureDef.filter.maskBits = C_Body; //マスク値
    fixtureDef.shape = this.shape;
    this.body.CreateFixture(fixtureDef); //Fixtureを作成してBodyに適用
    this.body.SetAngle(r*d/180*Math.PI); //回転
    
    //200ms後は強制的に削除
    this.anime_appear();

    this.addChildTo(layer1);
  },
  update: function(){
    if(this.body.GetFixtureList().GetUserData().strength <= 0){
      this.delete();
    }
  },
  delete: function(){
    layer.world.DestroyBody(this.body); //Bodyを削除
    this.remove(); //このクラス要素を削除
    this.disappear = true; //削除完了フラグ
  },
  anime_appear: function(){
    var v = this.body.GetFixtureList().GetShape().m_vertices;
    var a = anime.timeline({
      targets: this,
      easing: 'easeOutSine',
      duration: 50,
      delay: 50,
      direction: 'reverse',
      complete: () => { this.delete(); },
    });
    for(var i=0; i<this.shape.m_vertices.length; i++){
      a.add({
        targets: v[i],
        x: 0,
        y: 0,
        duration: 50,
      },0);
    }
    return 0;
  }
})

//================================================================//

//背景に描画する構文木
phina.define("viewAST", {
  superClass: "RectangleShape",
  init: function(id){
    this.superInit();
    this.fill = "white";
    this.alpha = 0.5;
    this.width = 120*5;
    this.height = 600;
    this.origin.set(0,0);
    
    this.id = id;

    if(id == 0){
      this.x = 240-6;
      this.y = 240-6;
    }else{
      this.x = 120*9-6;
      this.y = 240-6;
    }

    this.size = {x:1, y:1}

    //描画するブロックのスプライト情報
    this.astSprite = new Array();
    //仮のブロック情報
    this.astNone = {
      node: {
        getBrickType: "EntryBrick",
        getBrickCommand: "ComandFunctionStart",
        getBrickTab: -1,
        getBrickArgument: {
          disp: "n = ",
          value: "0",
        },
      },
      bottom: "Nil",
      right: "Nil",
    }
    console.log(this.astNone);
    //仮のブロック描画
    this.reset();

    this.addChildTo(layer1);
  },
  putASTxy: function(ast){
    //ブロック情報の削除
    if(this.astSprite){
      for(var i=0; i<this.astSprite.length; i++){
        this.astSprite[i].remove();
      }
      this.astSprite = new Array();
    }
    //引数の中身確認
    if(!ast || ast == "Nil") return;
    
    this.size.x = 120;
    this.size.y = 120;
    this.putAST(ast, 0, 0);

    var max = 5*120;
    if(this.size.x > max) max = this.size.x;
    if(this.size.y > max) max = this.size.y;
    this.reSize(max/120);
  },
  putAST: function(ast, x, y){
    this.astSprite.push(this.putBrick(ast.node.getBrickType, x, y));
    if(ast.right != "Nil"){
      if(this.size.x < x+240) this.size.x = x+240;
      this.putAST(ast.right, x+120, y);
    }
    if(ast.bottom != "Nil"){
      if(this.size.y < y+240) this.size.y = y+240;
      this.putAST(ast.bottom, x, y+120);
    }
  },
  putBrick: function(type, x, y){
    var color;
    console.log(type);
    switch(type){
      case "EntryBrick": color = "skyblue"; break;
      case "BasicBrick": color = "yellow"; break;
      case "CaseBrick": color = "limegreen"; break;
      case "TailBrick": color = "pink"; break;
      default : color = "gray"; break;
    }

    a = RectangleShape({
      x: x,             // x座標
      y: y,             // y座標
      width: 116,         // 横サイズ
      height: 116,        // 縦サイズ
      cornerRadius: 5,   // 角丸み
      fill: color,    // 色
      stroke: 'black',     // 枠色
      strokeWidth: 6,     // 枠太さ
    }).addChildTo(this);
    a.origin.set(0,0);

    return a;
  },
  reSize: function(n){
    if(n < 5) n = 5;
    this.width = 120*n;
    this.height = 120*n;
    this.scaleX = 5/n;
    this.scaleY = 5/n;
  },
  reset: function(){
    this.putASTxy(this.astNone);
  }
})

//================================================================//

//ボタンのクラス　デバッグ用
phina.define("MoveButton", {
	superClass: 'Button',
	init: function() {
		this.superInit({
		x: 1,             // x座標
		y: 1,             // y座標
		width: 80,         // 横サイズ
		height: 32,        // 縦サイズ
		text: "",     // 表示文字
		fontSize: 16,       // 文字サイズ
		fontColor: '#000000', // 文字色
		cornerRadius: 3,   // 角丸み
		fill: '#ffffff',    // ボタン色
		stroke: 'black',     // 枠色
		strokeWidth: 1,     // 枠太さ
		});
		this.origin.set(0,0);
	}
})



//================================================================//



// MainScene クラスを定義
phina.define('MainScene', {
  superClass: 'DisplayScene',
  init: function(option) {
    this.superInit(option);
    // 背景色を指定
    this.backgroundColor = '#666';
    // Box2d用レイヤー作成
    layer.addChildTo(this);
    // phina.js用レイヤー作成
    layer1 = DisplayElement().addChildTo(this); //背面
    layer2 = DisplayElement().addChildTo(this); //前面
    //地面
    stage = CreateStage().addChildTo(layer2);
    //スプライトを用意
    //操作対象
    chara[0] = Character(0, Player1(0), 300); //ヒト
    // chara[0] = Character(0, Enemy(0), 300); //ロボ
    //討伐対象
    chara[1] = Character(1, Enemy(1), SCREEN_WIDTH-300); //ヒト
    // chara[1] = Character(1, Player1(1), SCREEN_WIDTH-300); //ロボ
    chara[0].addChildTo(layer1);
    chara[1].addChildTo(layer1);
    chara[1].direction = -1;
    chara[0].player = true;
    chara[1].player = false;
    //キャラクター情報
    chara[0].info.addChildTo(layer2);
    chara[1].info.addChildTo(layer2);
    //全体情報
    info = MainInfo().addChildTo(layer2);
    info.startButton.onpointend = function(){
      if(chara[0].astNow && chara[1].astNow){
        info.anim.play();
        chara[0].howStart = () => {return true};
        chara[1].howStart = () => {return true};
        if(chara[0].anim.attackNow == 14){
          chara[0].anim.attackNow = 0;
          chara[0].anim.changeAnime = true;
        }
        if(chara[1].anim.attackNow == 14){
          chara[1].anim.attackNow = 0;
          chara[1].anim.changeAnime = true;
        }
        console.log("push start button");
        info.finish = false;
        info.start = true;
        info.startButton.fill = "#dddddd";
      }
    }
    //敵の行動準備
    chara[1].autoGetAST();

    //衝突判定の処理の定義
    shototsu = new Box2D.Dynamics.b2ContactListener;
    //衝突時の処理
    shototsu.BeginContact = function(contact) {
      console.log(contact);
      var a = contact.GetFixtureA().GetUserData();
      var b = contact.GetFixtureB().GetUserData();
      console.log(a.name + "と" + b.name + "が接触した" );
      //キャラクターが何かと衝突した
      if(a.name == 'Chara' || a.name == 'Chara_Body'){
        a.shototsu = true;
      }
      if(b.name == 'Chara' || b.name == 'Chara_Body'){
        b.shototsu = true;
      }
      //キャラクターと地面が衝突した
      if(a.name == 'Chara' && b.name == 'Stage_Ground'){
        a.touchGround = true;
        return;
      }else if(a.name == 'Stage_Ground' && b.name == 'Chara'){
        b.touchGround = true;
        return;
      }
      //キャラクターと壁が衝突した
      if(a.name == 'Chara' && b.name == 'Stage_Wall'){
        a.touchWall = true;
        return;
      }else if(b.name == 'Chara' && a.name == 'Stage_Wall'){
        b.touchWall = true;
        return;
      }
      //キャラクターと天井が衝突した
      if(a.name == 'Chara' && b.name == 'Stage_Ceiling'){
        a.touchCeiling = true;
        return;
      }else if(b.name == 'Chara' && a.name == 'Stage_Ceiling'){
        b.touchCeiling = true;
        return;
      }
      //弾が何かと衝突した
      if(a.name == 'Bullet'){
        a.hit = true;
        //ステージと衝突したら消滅する
        if(b.name == 'Stage_Ground' || b.name == 'Stage_Wall' || b.name == 'Stage_Ceiling'){
          a.strength = 0;
        }
      }
      if(b.name == 'Bullet'){
        b.hit = true;
        //ステージと衝突したら消滅する
        if(a.name == 'Stage_Ground' || a.name == 'Stage_Wall' || a.name == 'Stage_Ceiling'){
          b.strength = 0;
        }
      }
      //弾同士が衝突した
      if(a.name == 'Bullet' && b.name == 'Bullet'){
        //各弾の強さから最小値を獲得
        var work = Math.min(a.strength, b.strength);
        //弱い方は消滅し、強い方も弱る
        a.strength -= work;
        b.strength -= work;
      }
      //弾とキャラクターが衝突した
      if(a.name == 'Bullet' && b.name == 'Chara_Body'){
        a.strength = 0; //弾は消滅する
        b.damage.push(a.damage); //キャラクターはダメージを受ける
      }
      if(b.name == 'Bullet' && a.name == 'Chara_Body'){
        b.strength = 0;
        a.damage.push(b.damage);
      }
    };
    //離れた時の処理
    shototsu.EndContact = function(contact){
      var a = contact.GetFixtureA().GetUserData();
      var b = contact.GetFixtureB().GetUserData();
      console.log(a.name + "と" + b.name + "が離れた" );
      //キャラクターが地面から離れた
      if(a.name == 'Chara' && b.name == 'Stage_Ground'){
        a.touchGround = false;
        return;
      }else if(a.name == 'Stage_Ground' && b.name == 'Chara'){
        b.touchGround = false;
        return;
      }
      //キャラクターが壁から離れた
      if(a.name == 'Chara' && b.name == 'Stage_Wall'){
        a.touchWall = false;
        return;
      }else if(b.name == 'Chara' && a.name == 'Stage_Wall'){
        b.touchWall = false;
        return;
      }
      //キャラクターが天井から離れた
      if(a.name == 'Chara' && b.name == 'Stage_Ceiling'){
        a.touchCeiling = false;
        return;
      }else if(b.name == 'Chara' && a.name == 'Stage_Ceiling'){
        b.touchCeiling = false;
        return;
      }
    }
    //定義の適用
    layer.world.SetContactListener(shototsu);

    //エディタを開く ボタン
    var editorButton = Button({
      x: 120,             // x座標
      y: 1020,             // y座標
      width: 160,         // 横サイズ
      height: 40,        // 縦サイズ
      text: "エディタを開く",     // 表示文字
      fontSize: 20,       // 文字サイズ
      fontColor: '#000000', // 文字色
      cornerRadius: 3,   // 角丸み
      fill: '#ffffff',    // ボタン色
      stroke: 'black',     // 枠色
      strokeWidth: 1,     // 枠太さ
    }).addChildTo(this);
    editorButton.origin.set(0.5, 0.5);
    editorButton.onpointend = function(){
      console.log("open Editor");
      openEditor();
    };

    //ターン終了演出
    //帯
    this.turnendEffect = RectangleShape({
      x: SCREEN_WIDTH /2,
      y: SCREEN_HEIGHT /2,
      width: SCREEN_WIDTH +200,
      height: 200,
      fill: '#66bb66',
      stroke: '#226622',
      strokeWidth: 20,
    }).addChildTo(layer2);
    this.turnendEffect.origin.set(0.5, 0.5);
    this.turnendEffect.alpha = 0.6;
    this.turnendEffect.scaleY = 0;
    //文字
    this.turnendLabel = Label({
      x: -350,
      y: SCREEN_HEIGHT /2,
      text: "ターン終了！",
      fontSize: 100,
      fontColot: "#001100",
    }).addChildTo(layer2);
    this.turnendLabel.origin.set(0.5, 0.5);
    //アニメーション
    this.turnendAnime = anime.timeline({
      targets: this.turnendEffect,
      scaleY: [
        {value: 1, duration: 600, easing: 'easeOutExpo'},
        {value: 0, duration: 600, easing: 'easeInExpo'},
      ],
      autoplay: false,
    }).add({
      targets: this.turnendLabel,
      x: [
        {value: SCREEN_WIDTH/2, duration: 600, easing: 'easeOutExpo'},
        {value: SCREEN_WIDTH+350, duration: 600, easing: 'easeInExpo'},
      ]
    },0);

  },
  update: function(){
    if(!info.endGame && info.start && (this.checkEnd(0) && this.checkEnd(1) || info.finish)){
      this.turnEnd();
    }
  },
  checkEnd: function(id){
    id = id & 1;
    var tf = !chara[id].astNow && chara[id].anim.moveNow<=0 && !chara[id].anim.jumpNow && (!chara[id].anim.attackNow && chara[id].anim.canMove || chara[id].anim.attackNow == 14 || chara[id].anim.attackNow == 99) && !chara[id].anim.changeAnime;
    return tf;
  },
  turnEnd: function(){
    console.log("turn end");
    chara[0].howStart = () => {return false};
    chara[1].howStart = () => {return false};
    chara[0].doCommand = () => {};
    chara[1].doCommand = () => {};
    chara[0].astNow = null;
    chara[1].astNow = null;
    if(chara[0].anim.attackNow < 90 && chara[1].anim.attackNow < 90){
      info.start = false;
      info.anim.reset();
      this.turnendAnime.play();
      chara[0].info.condition.label.text = "準備中";
      chara[1].info.condition.label.text = "準備中";
      chara[0].ast.reset();
      chara[1].ast.reset();
      chara[0].anim.moveNow = 0;
      if(chara[0].anim.attackNow != 14) chara[0].anim.attackNow = 0;
      chara[0].anim.canMove = true;
      chara[0].anim.changeAnime = true;
      chara[1].anim.moveNow = 0;
      if(chara[1].anim.attackNow != 14) chara[1].anim.attackNow = 0;
      chara[1].anim.canMove = true;
      chara[1].anim.changeAnime = true;
      chara[0].info.recoverySkill();
      chara[1].info.recoverySkill();
      info.turn += 1;
      info.draw_turn.label.text = "ターン " + info.turn;
      chara[1].autoGetAST();
    }else{
      info.endGame = true;
      info.anim.pause();
      this.turnendLabel.text = "ゲームセット！";
      this.turnendAnime.add({
        begin: () => { this.turnendAnime.pause() },
      }, 600);
      this.turnendAnime.play();
      if(chara[0].anim.attackNow >= 90){
        chara[0].info.condition.label.text = "敗北";
      }else chara[0].info.condition.label.text = "勝利";
      if(chara[1].anim.attackNow >= 90){
        chara[1].info.condition.label.text = "敗北";
      }else chara[1].info.condition.label.text = "勝利";
    }
  }
});

//================================================================//

//メインシーン上に表示する情報まとめ
phina.define("MainInfo", {
  superClass: "DisplayElement",
  init: function(){
    this.superInit();
    this.origin.set(0,0);
    this.turn = 1;
    this.counter = 10000;
    this.start = false;
    this.finish = false;
    this.endGame = false;
    //残りターン
    this.draw_turn = {};
    this.draw_turn.box = RectangleShape({
      x: 120*8,             // x座標
      y: 30,             // y座標
      width: 160,         // 横サイズ
      height: 56,        // 縦サイズ
      cornerRadius: 1,   // 角丸み
      fill: '#dddddd',    // 色
      stroke: 'black',     // 枠色
      strokeWidth: 5,     // 枠太さ
    }).addChildTo(this);
    //数値
    this.draw_turn.label = Label({
      text: "ターン 1",     // 表示文字
      fontSize: 28,       // 文字サイズ
      fontColor: '#000000', // 文字色
      align: "center",
      baseline: "middle",
    }).addChildTo(this.draw_turn.box);
    //残り時間
    //ゲージ外部
    this.outGauge = RectangleShape({
      x: 120*8,             // x座標
      y: 120*0.8,             // y座標
      width: 1200-4,         // 横サイズ
      height: 15,        // 縦サイズ
      cornerRadius: 1,   // 角丸み
      fill: '#000000',    // 色
      stroke: 'black',     // 枠色
      strokeWidth: 8,     // 枠太さ
    }).addChildTo(this);
    //ゲージ内部
    this.inGauge = RectangleShape({
      x: 0,             // x座標
      y: 0,             // y座標
      width: 1200-4,         // 横サイズ
      height: 15,        // 縦サイズ
      cornerRadius: 1,   // 角丸み
      fill: '#66dd66',    // 色
      stroke: 'black',     // 枠色
      strokeWidth: 8,     // 枠太さ
    }).addChildTo(this.outGauge);
    //ターン開始ボタン
    this.startButton = Button({
      x: 120*8,             // x座標
      y: 120*8.5,             // y座標
      width: 200,         // 横サイズ
      height: 80,        // 縦サイズ
      text: "ターン開始！",     // 表示文字
      fontSize: 28,       // 文字サイズ
      fontColor: '#000000', // 文字色
      cornerRadius: 6,   // 角丸み
      fill: '#dddddd',    // 色
      stroke: 'black',     // 枠色
      strokeWidth: 6,     // 枠太さ
    }).addChildTo(this);

    this.anim = anime.timeline({
      targets: this.inGauge,
      scaleX: 0,
      easing: 'linear',
      duration: this.counter,
      complete: () => {console.log("count complete" + this.counter); this.finish=true},
    }).add({
      targets: this,
      counter: 0,
    });
    this.anim.reset();
  }
})



//================================================================//

// メイン処理
phina.main(function() {
  // アプリケーション生成
  var app = GameApp({
    fps: 60,
    startLabel: 'main', // メインシーンから開始する
    
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    
	  assets: ASSETS,
  });
  // アプリケーション実行
  app.run();
});
