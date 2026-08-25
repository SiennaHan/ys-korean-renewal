#!/usr/bin/env python3
"""전면 재저작된 대화 5개의 신판 한국어 + 새로 쓴 4개 언어 번역.

한국어는 신판 본교재에서 뽑은 원문이다. 지면이 줄바꿈 위치에서 어절을 끊어
'꽃 을'처럼 나오는 것과, 어휘 글로스 열이 섞여 들어온 것('무난하다')은
원문 대조로 바로잡았다.

번역은 새로 썼다. 구판 부록에도 번역은 없었고(부록 목차: 문법 활용연습·
듣기 지문·모범 답안·색인) 기존 en/jp/cn/vi도 같은 방식으로 만든 것이다.
기존 데이터의 결을 따랐다 — 직역이 아니라 자연스러운 구어, 화계(반말/해요체)
유지, 문화 항목은 풀어 쓰지 않고 그대로 둔다.

산출: verify/authored_dialogue.csv
"""
import os, csv

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = f"{HERE}/verify"

# (item_id, 화자, 성별, ko, en, jp, cn, vi)
D = []

# ── 8급 1과 본문 · 영주·은주 반말 · 남성 육아휴직과 성역할 ──────────────
D += [
("RP-8-1-001", "영주", None,
 "요즘은 육아 휴직을 신청하는 남성 직장인이 많아졌대. 예전에는 회사 눈치 보느라 못 쓰는 분위기였는데 확실히 사람들 인식이 많이 달라지긴 달라졌나 봐.",
 "I hear a lot more men at work are taking parental leave these days. It used to be that nobody could take it with the office watching, so people's attitudes really have changed.",
 "最近は育児休業を申請する男性の会社員が増えたんだって。前は会社の顔色をうかがって取れない雰囲気だったのに、people の意識は確かにずいぶん変わったみたいね。",
 "听说最近申请育儿假的男职员多起来了。以前是看公司脸色根本请不了的氛围，看来人们的观念确实变了不少。",
 "Nghe nói dạo này nhiều nam nhân viên xin nghỉ chăm con lắm. Trước đây cứ phải nhìn sắc mặt công ty nên chẳng dám nghỉ, xem ra nhận thức của mọi người đúng là đã thay đổi nhiều."),
("RP-8-1-002", "은주", "여",
 "맞아. 심지어 내 주변 부부들 중에는 육아 때문에 둘 중 한 사람은 회사를 그만둬야 하는 상황에서 남편이 가사를 전담하기로 한 경우도 종종 있어.",
 "Right. Among couples I know, there are even cases where one of them had to quit for childcare and the husband took over the housework full-time.",
 "そうだよね。私の周りの夫婦でも、育児のためにどちらかが会社を辞めなきゃいけない状況で、夫が家事を専任することにしたケースも時々あるよ。",
 "对啊。我身边的夫妻里，甚至还有因为育儿必须有一方辞职，结果丈夫全职做家务的情况。",
 "Đúng vậy. Trong số các cặp vợ chồng tớ quen, thậm chí có trường hợp vì con cái mà một trong hai phải nghỉ việc, và người chồng đã nhận hết việc nhà."),
("RP-8-1-003", "영주", None,
 "과거에는 남자가 가장으로서 가족의 생계를 책임졌던 반면에 요즘은 성별과 상관없이 개인의 적성과 전문성을 더 우선시하는 분위기인 것 같아.",
 "In the past the man was the head of the household and responsible for supporting the family, whereas these days the mood seems to put individual aptitude and expertise first, regardless of gender.",
 "昔は男性が大黒柱として家族の生計を担っていたのに対して、最近は性別に関係なく個人の適性や専門性を優先する雰囲気みたい。",
 "过去是男人作为顶梁柱负责养家，而现在好像更看重个人的能力和专长，跟性别没关系。",
 "Ngày trước đàn ông là trụ cột lo kinh tế cho cả nhà, còn bây giờ thì có vẻ người ta ưu tiên năng lực và chuyên môn của từng người hơn, không phân biệt giới tính."),
("RP-8-1-004", "은주", "여",
 "그렇지? 요즘은 직업을 선택할 때도 남녀 구분이 별로 없는 것 같아. 예전에는 주로 남성의 일이었던 기계나 건설 같은 공학 분야에서 활약하는 여성 전문가들도 많아졌잖아.",
 "Right? There's hardly any gender divide in choosing a job now either. There are a lot more women working in engineering fields like machinery and construction that used to be mostly men's work.",
 "でしょ？最近は職業を選ぶときも男女の区別があまりないみたい。昔は主に男性の仕事だった機械や建設みたいな工学分野で活躍する女性の専門家も増えたじゃない。",
 "是吧？现在选职业好像也没什么男女之分了。以前主要是男人干的机械、建筑这些工科领域，活跃的女专家也多起来了嘛。",
 "Đúng không? Bây giờ chọn nghề cũng chẳng còn phân biệt nam nữ mấy. Những ngành kỹ thuật như cơ khí hay xây dựng trước đây chủ yếu là việc của đàn ông, giờ cũng có nhiều chuyên gia nữ rồi còn gì."),
("RP-8-1-005", "영주", None,
 "남성들의 경우도 그래, 패션, 미용, 요리 분야는 말할 것도 없고 최근에는 섬세한 돌봄이 필요한 간호사나 유치원 교사 같은 직군에도 남성 지원자가 많다고 해.",
 "Same for men — fashion, beauty and cooking go without saying, and lately there are said to be plenty of male applicants for jobs that call for attentive care, like nurses and kindergarten teachers.",
 "男性の場合もそうだよ。ファッション、美容、料理の分野は言うまでもなく、最近は細やかなケアが必要な看護師や幼稚園の先生みたいな職種にも男性の応募者が多いんだって。",
 "男性也一样，时尚、美容、烹饪就不用说了，听说最近连需要细心照顾人的护士、幼儿园老师这类职业，男性应聘者也很多。",
 "Đàn ông cũng vậy, thời trang, làm đẹp, nấu ăn thì khỏi phải nói, gần đây nghe nói cả những nghề cần sự chăm sóc tỉ mỉ như y tá hay giáo viên mầm non cũng có nhiều nam giới ứng tuyển."),
("RP-8-1-006", "은주", "여",
 "‘남자다움’과 ‘여자다움’에 대한 고정관념이 깨지고 있는 것 같아. 요즘 연예인들만 해도 강하고 가부장적인 남자들보다는 온화하고 섬세한 매력을 가진 남자들이 더 인기가 있잖아.",
 "Stereotypes about \"manliness\" and \"femininity\" seem to be breaking down. Just look at celebrities these days — men with a gentle, delicate charm are more popular than strong, patriarchal ones.",
 "「男らしさ」「女らしさ」に対する固定観念が崩れてきてるみたい。最近の芸能人を見ても、強くて家父長的な男性より、穏やかで繊細な魅力のある男性のほうが人気あるじゃない。",
 "关于“男子气概”和“女人味”的刻板印象好像正在被打破。就看现在的艺人，比起强势、大男子主义的男性，温和细腻有魅力的男性更受欢迎嘛。",
 "Có vẻ những định kiến về “chất đàn ông” và “nét nữ tính” đang dần bị phá vỡ. Cứ nhìn các nghệ sĩ bây giờ mà xem, đàn ông dịu dàng, tinh tế lại được yêu thích hơn kiểu mạnh mẽ, gia trưởng."),
("RP-8-1-007", "영주", None,
 "자유롭고 당당하게 사는 여자들도 매력 있고 말이야.",
 "And women who live freely and confidently are attractive too.",
 "自由に堂々と生きてる女性も魅力的だしね。",
 "而且自由自在、落落大方生活的女性也很有魅力呢。",
 "Mà những người phụ nữ sống tự do, tự tin cũng cuốn hút lắm chứ."),
("RP-8-1-008", "은주", "여",
 "맞아. 남자든 여자든 고정된 성 역할에 얽매이지 않고 각자의 개성과 가치관에 맞게 사는 게 중요한 것 같아.",
 "Right. Whether you're a man or a woman, what matters is living by your own personality and values instead of being tied to fixed gender roles.",
 "そうだよね。男でも女でも、固定された性役割に縛られずに、それぞれの個性や価値観に合わせて生きることが大事だと思う。",
 "对。不管是男是女，重要的是不被固定的性别角色束缚，按照各自的个性和价值观生活。",
 "Đúng vậy. Dù là nam hay nữ, điều quan trọng là sống đúng với cá tính và giá trị của mình, không bị trói buộc bởi vai trò giới cố định."),
]

# ── 8급 6과 본문 · 유리·영주 반말 · 성년의 날 ──────────────────────────
D += [
("RP-8-6-001", "유리", "여",
 "영주야, 아까 네 동생이 꽃다발을 들고 가는 걸 봤는데 오늘 네 동생한테 뭐 좋은 일이라도 있니?",
 "Yeongju, I saw your sister carrying a bouquet earlier — is something good happening for her today?",
 "ヨンジュ、さっき妹さんが花束を持って行くのを見たんだけど、今日何かいいことでもあるの？",
 "英珠，刚才我看见你妹妹拿着花束走，今天她有什么好事吗？",
 "Yeongju à, lúc nãy tớ thấy em cậu cầm bó hoa đi, hôm nay em cậu có chuyện gì vui à?"),
("RP-8-6-002", "영주", None,
 "응, 성년의 날이라서 동아리 선배들한테 꽃다발을 받았대. 우리나라는 5월 셋째 주 월요일이 성년의 날이거든.",
 "Yeah, it's Coming-of-Age Day, so she got a bouquet from her club seniors. In Korea, Coming-of-Age Day is the third Monday of May.",
 "うん、成年の日だからサークルの先輩たちに花束をもらったんだって。韓国は5月の第3月曜日が成年の日なの。",
 "嗯，今天是成年日，她收到了社团前辈送的花束。我们国家把5月第三个星期一定为成年日。",
 "Ừ, hôm nay là Ngày Thành Niên nên em tớ được các anh chị khóa trên trong câu lạc bộ tặng hoa. Ở Hàn Quốc, Ngày Thành Niên là thứ Hai tuần thứ ba của tháng 5."),
("RP-8-6-003", "유리", "여",
 "아, 그렇구나. 일본은 1월 둘째 주 일요일인데. 한국에서는 성년의 날에 꽃을 선물하나 보지?",
 "Oh, I see. In Japan it's the second Sunday of January. So in Korea people give flowers on Coming-of-Age Day?",
 "あ、そうなんだ。日本は1月の第2日曜日だけど。韓国では成年の日に花を贈るんだね？",
 "啊，原来是这样。日本是1月第二个星期天呢。看来在韩国，成年日要送花？",
 "À, ra vậy. Ở Nhật thì là Chủ nhật tuần thứ hai của tháng 1. Vậy ở Hàn Quốc, Ngày Thành Niên người ta tặng hoa à?"),
("RP-8-6-004", "영주", None,
 # 교재 원문의 '의미 있는 선물 해 주기도 하고'는 목적격 조사가 빠져 있다.
 # 1급 때 교재 오인쇄를 교정하고 기록한 선례를 따라 '선물을'로 교정한다.
 "응, 기념일에는 꽃 선물이 무난하지. 특히 성년의 날에는 주변 사람들이 성인이 된 사람에게는 열정과 사랑이 가득한 어른이 되라는 뜻에서 장미꽃을 선물해 줘, 나이에 맞춰서 스무 송이로. 사회 생활에 꼭 필요한 실용적인 물건이나 의미 있는 선물을 해 주기도 하고.",
 "Yeah, flowers are a safe gift for any occasion. On Coming-of-Age Day especially, people give roses to someone who has just come of age — twenty of them, to match the age — wishing them to grow into an adult full of passion and love. Some also give practical things you need in working life, or something meaningful.",
 "うん、記念日には花のプレゼントが無難だよね。特に成年の日は、周りの人が成人になった人に、情熱と愛にあふれた大人になってほしいという意味でバラを贈るの。年齢に合わせて20本ね。社会生活に欠かせない実用的な物や、意味のある贈り物をすることもあるよ。",
 "嗯，纪念日送花总是稳妥的。尤其成年日，周围的人会送刚成年的人玫瑰花，寓意成为充满热情和爱的大人，按年龄送二十朵。也有人送社会生活中必需的实用物品，或者有意义的礼物。",
 "Ừ, dịp kỷ niệm thì tặng hoa là an toàn nhất. Đặc biệt vào Ngày Thành Niên, mọi người tặng hoa hồng cho người vừa trưởng thành — hai mươi bông đúng bằng tuổi — với ý mong họ thành người lớn tràn đầy nhiệt huyết và tình yêu. Cũng có người tặng những món thiết thực cần cho đời sống xã hội, hoặc món quà mang ý nghĩa."),
("RP-8-6-005", "유리", "여",
 "그럼 넌 성인식 날에 무슨 선물을 받았어?",
 "So what did you get on your own coming-of-age day?",
 "じゃあ、あなたは成人式の日に何をもらったの？",
 "那你成年礼那天收到了什么礼物？",
 "Thế còn cậu, ngày lễ trưởng thành cậu được tặng gì?"),
("RP-8-6-006", "영주", None,
 "아빠한테서는 만년필을 선물 받고 엄마한테서는 반지를 받았어. 엄마가 끼시던 반지를 물려주시면서 이제 어른이 되었으니 자신이 내린 결정에 스스로 책임을 질 줄 알아야 한다고 하셨어. 그런데 지금 난 나이만 먹었다뿐이지 어른으로서 책임과 의무를 다하고 있는지 잘 모르겠어.",
 "I got a fountain pen from my dad and a ring from my mom. She passed down the ring she used to wear and told me that now I'm an adult I have to take responsibility for my own decisions. But honestly, I've just gotten older — I'm not sure I'm really living up to an adult's responsibilities and duties.",
 "お父さんからは万年筆を、お母さんからは指輪をもらったよ。お母さんが使っていた指輪を譲ってくれながら、もう大人になったんだから自分が下した決定には自分で責任を持てるようにならなきゃって言われたの。でも今の私は年をとっただけで、大人としての責任や義務を果たせているのかよく分からない。",
 "爸爸送了我钢笔，妈妈送了我戒指。妈妈把她戴过的戒指传给我，说我已经是大人了，要学会对自己做的决定负责。可是现在的我只是年龄长了，也不知道有没有尽到大人的责任和义务。",
 "Bố tặng tớ bút máy, còn mẹ tặng tớ chiếc nhẫn. Mẹ trao lại chiếc nhẫn mẹ từng đeo và bảo giờ tớ đã là người lớn thì phải biết tự chịu trách nhiệm với quyết định của mình. Nhưng bây giờ tớ chỉ là nhiều tuổi hơn thôi, chẳng biết mình có đang làm tròn trách nhiệm và nghĩa vụ của một người lớn hay không."),
("RP-8-6-007", "유리", "여",
 "와, 그런 생각을 하다니 대단한걸. 이제 어른이랍시고 자유와 권리만 누리려는 사람들도 있는데 말이야. 일본에서는 보통 집 근처 관공서에서 성인식을 하는데 나도 성인식을 하고 나니 비로소 어른으로서의 책임감이 느껴지더라.",
 "Wow, it's impressive that you even think about that. There are people who, now that they're supposedly adults, just want the freedom and the rights. In Japan the coming-of-age ceremony is usually held at the local government office, and after mine I finally felt a sense of responsibility as an adult.",
 "わあ、そんなことまで考えてるなんてすごいね。大人だからって自由と権利だけを享受しようとする人もいるのに。日本では普通、家の近くの役所で成人式をするんだけど、私も成人式を終えてやっと大人としての責任感を感じたよ。",
 "哇，你能想到这些真了不起。还有人自以为成年了，只想享受自由和权利呢。在日本，成人礼一般在家附近的政府机关举行，我也是办完成人礼才第一次感受到作为大人的责任感。",
 "Ồ, cậu nghĩ được đến vậy thì giỏi thật. Có người vừa mới thành người lớn đã chỉ muốn hưởng tự do với quyền lợi thôi đấy. Ở Nhật thì lễ trưởng thành thường tổ chức ở cơ quan hành chính gần nhà, tớ cũng phải làm lễ xong mới thực sự thấy được trách nhiệm của một người lớn."),
("RP-8-6-008", "영주", None,
 "그렇구나. 네 말을 듣고 보니 관공서에서 의식을 치르면 마음가짐이 더 새롭겠다.",
 "I see. Hearing you say that, going through a ceremony at a government office would probably make you feel it more freshly.",
 "そうなんだ。あなたの話を聞くと、役所で儀式をすると気持ちがもっと新たになりそうだね。",
 "原来如此。听你这么一说，在政府机关举行仪式，心境应该会更不一样吧。",
 "Ra vậy. Nghe cậu nói thì làm nghi lễ ở cơ quan hành chính chắc sẽ khiến tâm thế mình mới mẻ hơn nhỉ."),
]

# ── 6급 5과 본문 · 유리·영주 반말 · 교통 카드 대신 신용 카드 ────────────
D += [
("RP-6-5-001", "유리", "여",
 "며칠 전에 교통 카드를 잃어버리고 다시 사는 걸 잊어버렸는데 어떻게 하지?",
 "I lost my transit card a few days ago and forgot to buy a new one. What should I do?",
 "何日か前に交通カードをなくして、買い直すのを忘れちゃったんだけど、どうしよう？",
 "前几天我把交通卡弄丢了，又忘了重新买，这可怎么办？",
 "Mấy hôm trước tớ làm mất thẻ giao thông rồi quên mua lại, giờ làm sao đây?"),
("RP-6-5-002", "영주", None,
 "내 신용 카드로 요금을 낼게. 요즘은 교통 카드를 따로 가지고 다니는 대신에 카드나 앱으로 많이 써.",
 "I'll pay with my credit card. These days, instead of carrying a separate transit card, people mostly use a card or an app.",
 "私のクレジットカードで払うよ。最近は交通カードを別に持ち歩く代わりに、カードやアプリを使うことが多いの。",
 "我用信用卡付吧。现在大家不再单独带交通卡，多半用银行卡或者手机应用。",
 "Để tớ trả bằng thẻ tín dụng. Dạo này thay vì mang theo thẻ giao thông riêng, người ta hay dùng thẻ hoặc ứng dụng lắm."),
("RP-6-5-003", "유리", "여",
 "신용 카드로도 탈 수 있구나.",
 "So you can ride with a credit card too.",
 "クレジットカードでも乗れるんだね。",
 "原来用信用卡也能坐车啊。",
 "Hóa ra dùng thẻ tín dụng cũng đi được à."),
("RP-6-5-004", "영주", None,
 "응, 따로 교통 카드를 구입하지 않아도 될 뿐만 아니라 돈이 없을 때도 낼 수 있으니까 편해.",
 "Yeah. Not only do you not have to buy a separate transit card, you can also pay when you have no cash, so it's convenient.",
 "うん、交通カードを別に買わなくてもいいだけじゃなくて、お金がないときも払えるから便利だよ。",
 "嗯，不但不用另外买交通卡，没带钱的时候也能付，很方便。",
 "Ừ, không những không cần mua thẻ giao thông riêng mà lúc không có tiền vẫn trả được nên tiện lắm."),
("RP-6-5-005", "유리", "여",
 "장점이 많구나. 모든 신용 카드가 다 되는 거야?",
 "That has a lot of advantages. Does every credit card work?",
 "長所が多いんだね。どのクレジットカードでも使えるの？",
 "优点真多啊。是所有信用卡都可以吗？",
 "Nhiều ưu điểm thật đấy. Thẻ tín dụng nào cũng dùng được à?"),
("RP-6-5-006", "영주", None,
 "은행에서 카드를 만들 때 따로 신청하면 돼.",
 "You just have to apply for it separately when you get the card at the bank.",
 "銀行でカードを作るときに別途申し込めばいいよ。",
 "在银行办卡的时候单独申请一下就行。",
 "Khi làm thẻ ở ngân hàng thì đăng ký thêm là được."),
]

# ── 6급 13과 본문 · 슈테판·영주 해요체 · 인공 지능 (지하철 승강장에서) ──
D += [
("RP-6-13-001", "슈테판", "남",
 "영주 씨, 이것 좀 봐요. 제가 요청하니까 인공 지능이 바로 영화의 한 장면을 만들어 줬어요.",
 "Yeongju, take a look at this. I made a request and the AI created a movie scene for me right away.",
 "ヨンジュさん、これちょっと見てください。私が頼んだら、人工知能がすぐ映画のワンシーンを作ってくれたんですよ。",
 "英珠，你看看这个。我一提要求，人工智能马上就做出了一个电影场景。",
 "Yeongju này, xem cái này đi. Tôi vừa yêu cầu thì trí tuệ nhân tạo đã tạo ngay một cảnh phim cho tôi đấy."),
("RP-6-13-002", "영주", None,
 "와, 신기하네요. 진짜 배우들이 촬영한 것 같아요.",
 "Wow, that's amazing. It looks like real actors filmed it.",
 "わあ、すごいですね。本物の俳優が撮影したみたいです。",
 "哇，真神奇。就像真的演员拍的一样。",
 "Ồ, thần kỳ thật. Trông cứ như diễn viên thật quay vậy."),
("RP-6-13-003", "슈테판", "남",
 "인공 지능이 작곡도 하고 책도 쓰잖아요. 이제 인공 지능으로 할 수 없는 게 없답니다.",
 "AI composes music and writes books too, you know. There's nothing you can't do with AI now.",
 "人工知能は作曲もするし本も書くじゃないですか。もう人工知能でできないことはないんですよ。",
 "人工智能既会作曲又会写书嘛。现在用人工智能没有做不到的事。",
 "Trí tuệ nhân tạo còn soạn nhạc, viết sách nữa mà. Bây giờ chẳng có gì là AI không làm được cả."),
("RP-6-13-004", "영주", None,
 "발전 속도가 정말 빠르네요.",
 "It really is developing fast.",
 "発展の速度が本当に速いですね。",
 "发展速度真是太快了。",
 "Tốc độ phát triển nhanh thật đấy."),
("RP-6-13-005", "슈테판", "남",
 "그래서 좀 무섭기도 해요.",
 "That's why it's a little scary, too.",
 "だから少し怖くもあります。",
 "所以也让人有点害怕。",
 "Nên cũng hơi đáng sợ nữa."),
("RP-6-13-006", "영주", None,
 "이렇게 계속 발전한다면 인공 지능과 진짜 친구가 될 날도 멀지 않았겠어요.",
 "If it keeps developing like this, the day we actually become friends with AI can't be far off.",
 "このまま発展し続けたら、人工知能と本当の友達になる日も遠くなさそうですね。",
 "照这样发展下去，和人工智能成为真正的朋友的日子也不远了吧。",
 "Cứ phát triển thế này thì ngày chúng ta thành bạn thật sự với trí tuệ nhân tạo chắc cũng không xa đâu."),
]

# ── 5급 6과 과제1 · 유리·영주 반말 · 신사동 가로수길 → 성수동 ──────────
D += [
("RP-5-6-007", "유리", "여",
 "영주야, 다음 주말에 남자 친구가 서울에 오는데 어디로 갈까?",
 "Yeongju, my boyfriend is coming to Seoul next weekend — where should we go?",
 "ヨンジュ、来週末に彼氏がソウルに来るんだけど、どこに行こうかな？",
 "英珠，下周末我男朋友要来首尔，我们去哪儿好呢？",
 "Yeongju à, cuối tuần sau bạn trai tớ lên Seoul, đi đâu bây giờ nhỉ?"),
("RP-5-6-008", "영주", None,
 "서울에서 뭘 하고 싶어?",
 "What do you want to do in Seoul?",
 "ソウルで何がしたいの？",
 "你们想在首尔做什么？",
 "Cậu muốn làm gì ở Seoul?"),
("RP-5-6-009", "유리", "여",
 "같이 맛있는 음식도 먹고 쇼핑도 할 거야.",
 "We're going to eat good food together and do some shopping.",
 "一緒においしいものも食べて、買い物もするつもり。",
 "打算一起吃点好吃的，再逛逛街。",
 "Bọn tớ định cùng ăn món ngon rồi đi mua sắm."),
("RP-5-6-010", "영주", None,
 "그럼 요즘 인기 있는 성수동 어때?",
 "Then how about Seongsu-dong? It's popular these days.",
 "じゃあ、最近人気のソンスドンはどう？",
 "那去最近很火的圣水洞怎么样？",
 "Vậy thì Seongsu-dong dạo này đang nổi, thấy sao?"),
("RP-5-6-011", "유리", "여",
 "성수동?",
 "Seongsu-dong?",
 "ソンスドン？",
 "圣水洞？",
 "Seongsu-dong á?"),
("RP-5-6-012", "영주", None,
 "응, 예쁜 카페도 많고 맛집도 많아.",
 "Yeah, there are lots of pretty cafés and lots of good restaurants.",
 "うん、おしゃれなカフェも多いし、おいしい店も多いよ。",
 "嗯，那儿漂亮的咖啡厅多，好吃的店也多。",
 "Ừ, ở đó nhiều quán cà phê xinh xắn mà quán ăn ngon cũng nhiều."),
("RP-5-6-013", "유리", "여",
 "남자 친구가 구두를 사고 싶어하는데 구두 가게도 있어?",
 "My boyfriend wants to buy dress shoes — are there shoe shops there too?",
 "彼氏が靴を買いたがってるんだけど、靴屋さんもある？",
 "我男朋友想买双皮鞋，那边有鞋店吗？",
 "Bạn trai tớ muốn mua giày da, ở đó có cửa hàng giày không?"),
("RP-5-6-014", "영주", None,
 "요즘 유행하는 옷이나 구두를 파는 가게도 많아.",
 "There are plenty of shops selling trendy clothes and shoes as well.",
 "最近流行の服や靴を売っている店も多いよ。",
 "卖当下流行的衣服和鞋子的店也很多。",
 "Cửa hàng bán quần áo và giày đang mốt cũng nhiều lắm."),
("RP-5-6-015", "유리", "여",
 "그렇구나. 좋은 곳을 알려 줘서 고마워.",
 "I see. Thanks for telling me about a good spot.",
 "そうなんだ。いいところを教えてくれてありがとう。",
 "原来如此。谢谢你告诉我这么好的地方。",
 "Ra vậy. Cảm ơn cậu đã chỉ cho tớ chỗ hay nhé."),
]


def main():
    os.makedirs(OUT, exist_ok=True)
    path = f"{OUT}/authored_dialogue.csv"
    with open(path, "w", newline="") as f:
        wr = csv.writer(f)
        wr.writerow(["item_id", "speaker", "gender", "ko", "en", "jp", "cn", "vi"])
        wr.writerows(D)
    print(f"재저작 대화 {len(D)}턴 -> {path}")
    import collections
    per = collections.Counter(i.rsplit("-", 1)[0] for i, *_ in D)
    for k, v in sorted(per.items()):
        print(f"  {k}: {v}턴")


if __name__ == "__main__":
    main()
