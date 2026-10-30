// Conteúdo do Conta-me Uma História.
// Imagens, PDFs e áudios continuam alojados no Wix original.

const PDF = (id) => `https://56dd32b4-427b-445c-9cea-7b1fa07d8724.filesusr.com/ugd/d40862_${id}.pdf`;
const IMG = (file, w = 640, h = 480) =>
  `https://static.wixstatic.com/media/d40862_${file}/v1/fill/w_${w},h_${h},al_c,q_85/${file}`;
const MP3 = (id) => `https://music.wixstatic.com/mp3/d40862_${id}.mp3`;

// Histórias ilustradas: texto, jogo ("Consegues acertar?") e história em imagens.
// `book` = slug do livro em assets/books/ (gerado com tools/pdf_to_book.py), lido em livro.html.
// `quizPage` = há questionário em assets/books/<book>.quiz.js (tools/pdf_to_quiz.py), aberto em quiz.html.
window.ILLUSTRATED = [
  { title: "A Velha Mansão", blurb: "Lê se tiveres coragem…", age: [7, 9], cover: "bb3cf53a61bc4d8abefc954c5971f3ca~mv2.png", book: "a-velha-mansao", quizPage: true,
    text: PDF("de20dd48179343008104f4637b72f1f9"), quiz: PDF("b2e65296566c47558f0d1cb1b6a1f552"), pictures: PDF("cdb56f4c70a6492f807f5dfc2aa05b39") },
  { title: "A Beleza dos Amigos", book: "a-beleza-dos-amigos", quizPage: true, blurb: "Verdadeiros amigos são sempre bonitos…", age: [4, 9], cover: "2ba5e258140a465e863df90b1c01c70e~mv2.jpg",
    text: PDF("c5d52a76b4ef4b3dac4ba5c5997bacb2"), quiz: PDF("042b9caa5f3e4ff09d54813ee327b64f"), pictures: PDF("e38d82aa484b4d22a66bdb7b23e65179") },
  { title: "No Vale dos Pequenotes", book: "no-vale-dos-pequenotes", quizPage: true, blurb: "O mundo fantástico dum povo de baixinhos…", age: [5, 9], cover: "d7f037aca70b4f84a9a0b7ca760106d2~mv2.jpg",
    text: PDF("901c415924e1458d8c83e4a5e364ce40"), quiz: PDF("8fec299112ef49e580a273d2679810bf"), pictures: PDF("1e74fc2730994e94b3b0410332b6f33b") },
  { title: "A Flauta Constipada", book: "a-flauta-constipada", quizPage: true, blurb: "Devemos tratar bem as nossas coisas…", age: [4, 9], cover: "d83062e99639487b9cf633108b351af4~mv2.jpg",
    text: PDF("76314434596b4ef79aed520bd58cde76"), quiz: PDF("8391ff8e8a834038a6579ec2dc836259"), pictures: PDF("7acc8b05e5b943b0ac4e931043e506a5") },
  { title: "A Cambalhota", book: "a-cambalhota", quizPage: true, blurb: "Para os que gostam de futebol…", age: [5, 10], cover: "0e714c3a94a644238ee438fbfd5de34d~mv2.jpg",
    text: PDF("1ad6028acec24801bb08adc8d695e238"), quiz: PDF("c8ef312e0b5a4a6dbceabbe220b11330"), pictures: PDF("9d5e4f51934045f58abca1d1a3bdf125") },
  { title: "Laçarote, o Cavaleiro Trapalhão", book: "lacarote-o-cavaleiro-trapalhao", quizPage: true, blurb: "A divertida aventura de um jeitoso cavaleiro…", age: [7, 10], cover: "18834e60a4bd499a803d27c9b93ab15c~mv2.jpg",
    text: PDF("40c4a504a38548de9d821dd09569f744"), quiz: PDF("952d4d0c917045d18130c4c2fbd7b383"), pictures: PDF("c0be1495a584462abbdff75d70d47d98") },
  { title: "A Tartaruga Marinha", book: "a-tartaruga-marinha", quizPage: true, blurb: "Vão nascer as tartaruguinhas…", age: [5, 9], cover: "b42661520a2f4a769998a67137dcb53d~mv2.jpg",
    text: PDF("b8517f3980844b39a49f00b5b50b17ce"), quiz: PDF("1447ce1b2d254c7cb890b8b0b63ec13e"), pictures: PDF("74bb330d7df744a2838bec145626885f") },
  { title: "As Palavras Mágicas", book: "as-palavras-magicas", quizPage: true, blurb: "Aquelas que todas as crianças devem saber…", age: [4, 9], cover: "10b9260e641f44c4ab099fbe9f2a0b2e~mv2.jpg",
    text: PDF("ce987872843b4da985b2905041a85d33"), quiz: PDF("821992f44b0b4ab98c3ca44fb0cf6f18"), pictures: PDF("a7fed68c141f42f0b825e9c420b5c0ec") },
  { title: "Harmon", book: "harmon", quizPage: true, blurb: "A natureza pode fazer-nos felizes…", age: [6, 10], cover: "2cad35ccaed94496a933301ea5898d2a~mv2.jpg",
    text: PDF("e30077653aa74bc388bcb75fb798a211"), quiz: PDF("8617b50beb94480f8465fabb57c8e68b"), pictures: PDF("33a7d40473124163b5d296e57ef34b59") },
  { title: "Pérola", book: "perola", quizPage: true, blurb: "Uma vitória do Bem sobre o Mal…", age: [5, 10], cover: "1e9d7eb5b9eb44e5a4106f1bf2784c0e~mv2.jpg",
    text: PDF("401ae49b57fa4dc3a41a548cb78a1541"), quiz: PDF("abae00f882ca4400bc5f6e110aaa6bff"), pictures: PDF("5b06f7d575f54536a1a6dbef86a4f835") },
  { title: "No Dentista", book: "no-dentista", quizPage: true, blurb: "Quem ficará com os nossos dentinhos?", age: [5, 9], cover: "6b4a2ac3ad6b4a26ae34f5e9ace89109~mv2.jpg",
    text: PDF("21b20130da5c4456b182cf63cf7adaaf"), quiz: PDF("8973527725cd42ba9bb3c7eba39ff710"), pictures: PDF("e61a31afb2484b47aa2963557599bd51") },
  { title: "Brincadeira de Bruxinha", book: "brincadeira-de-bruxinha", quizPage: true, blurb: "Afinal foi uma tarde divertida…", age: [4, 8], cover: "2bb3c574e78c41eb87597cd6a3c01fbd~mv2.jpg",
    text: PDF("00648564d42340c9830f8acaaba5b439"), quiz: PDF("26b8c7306fec426db5bca9b0cd4e22a5"), pictures: PDF("4f491e856c564f5c9d52be157535cc11") },
  { title: "Ao Amanhecer", book: "ao-amanhecer", quizPage: true, blurb: "Quando se acorda cedo, tudo pode acontecer.", age: [5, 9], cover: "9709cceebe7f4e49a055771597f6f249~mv2.jpg",
    text: PDF("dbe591d1f996454b9b309f0a7b510c87"), quiz: PDF("076b3276ed6448ccb6efa6d0a8aa3cbc"), pictures: PDF("e769c10c914f48feaf6dee1d50ba6f08") },
  { title: "Tão Diferentes mas Amigos", book: "tao-diferentes-mas-amigos", quizPage: true, blurb: "Baixos ou altos, amigos são amigos…", age: [4, 9], cover: "72bf4cc7400d4e67abcb6e4c29cf062c~mv2.jpg",
    text: PDF("eb18fd5188b14a1083169433d2b2af6c"), quiz: PDF("932046dcf2ec4a1d8b5d05338d7efa4f"), pictures: PDF("a326513603b54d01bf7a774b43d80cf6") },
  { title: "Uma Família Real Preguiçosa", book: "uma-familia-real-preguicosa", quizPage: true, blurb: "Um pequeno teatrinho…", age: [7, 10], cover: "bed4b8ed14ef4900b135937d719968a3~mv2.png",
    text: PDF("1606fbf5b5a348c4bbdb9a63abe2f31d"), quiz: PDF("8e41013186fc47f78ac8311ad68c0d46"), pictures: PDF("b35c78e59b2a433dafa44f0f766f8c72") },
];

// Histórias do arquivo (só texto).
window.ARCHIVE = [
  { title: "Um Segredo Azul", book: "um-segredo-azul", blurb: "Nunca o azul foi tão mágico…", age: [5, 12], pdf: PDF("fc05a1ae812c44d2a587637c6f276592") },
  { title: "Na Ilha do Pessegueiro", book: "na-ilha-do-pessegueiro", blurb: "Uma aventura com piratas…", age: [7, 12], pdf: PDF("24c199f0cacc4b7b87a35101ece52e4d") },
  { title: "Rosa e Azul", book: "rosa-e-azul", blurb: "Uma história sobre a cor da nossa pele…", age: [8, 12], pdf: PDF("ab0c4bc8dd4d4f7b8e0ffcabc66d3ce8") },
  { title: "Tomás e o Duende", book: "tomas-e-o-duende", blurb: "Tudo é diferente em Fantália…", age: [5, 10], pdf: PDF("a717bc510d1e4084ab9466f3f5672f1f") },
  { title: "Uma Prenda Especial", book: "uma-prenda-especial", blurb: "Uma história para o Natal…", age: [5, 10], pdf: PDF("39e5398876e8424eac22117d22b83e43") },
  { title: "As Botas Não São Para Todos", book: "as-botas-nao-sao-para-todos", blurb: "Nem todos podem ser o Gato das Botas…", age: [5, 10], pdf: PDF("2c99e8b4a28342bc9224767d6dae42e0") },
  { title: "Amizade", book: "amizade", blurb: "Amigos do coração…", age: [7, 10], pdf: PDF("c81fa77bfaea492aad5b2dceb77ba593") },
  { title: "Um Livro Só com Palavras", book: "um-livro-so-com-palavras", blurb: "Um livro pode ser uma aventura…", age: [8, 12], pdf: PDF("4ad1c4c50ace488eafead5c3d1814445") },
  { title: "O Amuleto", book: "o-amuleto", blurb: "Uma aventura no antigo Egito…", age: [8, 12], pdf: PDF("91133901baf540caa5af322f1baf829d") },
  { title: "O Tesouro", book: "o-tesouro", blurb: "Todos temos um tesouro…", age: [5, 10], pdf: PDF("74c7c4ec899d44dfb59b60122ba693e8") },
  { title: "Pacholinha e Toc Toc", book: "pacholinha-e-toc-toc", blurb: "Vamos aprender com estes dois amigos…", age: [5, 10], pdf: PDF("1d25c81327304eecb21fc2f8f986575e") },
  { title: "Pequenos Amigos", book: "pequenos-amigos", blurb: "Tanta coisa para descobrir…", age: [7, 12], pdf: PDF("5f940216f0b54cc2bd4b28a7df85843e") },
  { title: "No Mundo dos Pequeninos", book: "no-mundo-dos-pequeninos", blurb: "E se de repente ficássemos muito pequeninos?", age: [5, 7], pdf: PDF("9c5adb793afd428e81fa98a8d1c220e0") },
  { title: "Uma Aventura no Mar", book: "uma-aventura-no-mar", blurb: "O mar pode ser mágico…", age: [7, 12], pdf: PDF("339cde6b994f484e83b03ba11802de56") },
  { title: "Um Bosque Encantado", book: "um-bosque-encantado", blurb: "Princesas, fadas e duendes…", age: [5, 10], pdf: PDF("fa0c2fc89d1f4107817dadc2f5a8ea49") },
  { title: "A Outra História do Chapeuzinho Vermelho", book: "a-outra-historia-do-chapeuzinho-vermelho", blurb: "Outro final feliz para a conhecida história…", age: [5, 10], pdf: PDF("0f6a7a58fcc743489d68061369c416a3") },
  { title: "Papão", book: "papao", blurb: "Histórias de fantasmas, ou talvez não…", age: [12, 12], pdf: PDF("8c59e28a152d42559317b1b061e95fd2") },
  { title: "Os Guardiães", book: "os-guardiaes", blurb: "Os defensores da Paz…", age: [7, 12], pdf: PDF("e6f8af9437834ae885326da160036a3e") },
  { title: "O Cavalinho Mágico", book: "o-cavalinho-magico", blurb: "Um menino e o seu cavalinho muito especial…", age: [5, 8], pdf: PDF("c766f8e3ca7e4db4bbe490acbc84b8b3") },
  { title: "O Mundo Fantástico das Cores", book: "o-mundo-fantastico-das-cores", blurb: "E a magia colorida pode acontecer…", age: [7, 12], pdf: PDF("b17cd6e6ba4f4e8b98f46523a6b92b34") },
];

window.AUDIO = [
  { title: "Pacholinha e Toc Toc", duration: "3:52", src: MP3("d7bb60b534954fec919af6190432307f") },
  { title: "Um Segredo Azul", duration: "23:16", src: MP3("7eb6b004ece7423184ca7df457ebf659") },
  { title: "Tomás e o Duende", duration: "11:22", src: MP3("a0531660bb784eee80171bbe1b880b3e") },
  { title: "Os Guardiães", duration: "5:25", src: MP3("fccdce72b89b42a19cb7431d597b7094") },
  { title: "Brincadeira de Bruxinha", duration: "9:16", src: MP3("491ca604e7c64f51a684280c6a501253") },
  { title: "Uma Prenda Especial", duration: "9:38", src: MP3("76ef4e4bc7d94d7dbcc5e25ed2250373") },
  { title: "Tão Diferentes mas Amigos", duration: "9:50", src: MP3("b32ebc28b68a4716bd6fcad49dc5aa6b") },
  { title: "Na Ilha do Pessegueiro", duration: "14:49", src: MP3("bacdd6d6a7904e03bb37dec0fed3fe06") },
  { title: "As Botas Não São Para Todos", duration: "4:59", src: MP3("62e79dc37fd64f9d970dccd7033d03c6") },
  { title: "Rosa e Azul", note: "só música", duration: "3:22", src: MP3("fc8a397267564acb933fb1af236fe714") },
];

window.IMG = IMG;

// Link do "Consegues acertar?": a página interativa se existir, senão o PDF.
window.quizHref = (s) => s.quizPage ? `quiz.html?h=${s.book}` : s.quiz;
window.quizTarget = (s) => s.quizPage ? "" : ' target="_blank" rel="noopener"';
