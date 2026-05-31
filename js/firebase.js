var firebaseConfig = {
  apiKey: "AIzaSyDAZJP5PVjj-iRGKoiR22-M2EBzp61OaDA",
  authDomain: "gestaorevenda-f4334.firebaseapp.com",
  projectId: "gestaorevenda-f4334",
  storageBucket: "gestaorevenda-f4334.firebasestorage.app",
  messagingSenderId: "893230315835",
  appId: "1:893230315835:web:15fe289a91fb1da42b1f1e"
};

var db, auth, reconnectAttempts = 0, maxReconnectAttempts = 5;
var isOnline = navigator.onLine;

function attemptReconnect(delay) {
    delay = delay || 1000;
    if (reconnectAttempts >= maxReconnectAttempts) {
        console.error("❌ Máximo de tentativas de reconexão atingido");
        return;
    }
    reconnectAttempts++;
    console.log("🔄 Tentativa " + reconnectAttempts + "/" + maxReconnectAttempts + " de reconexão em " + delay + "ms...");
    setTimeout(function() {
        db.collection('connectivity_test').limit(1).get()
            .then(function() {
                console.log("✅ Conexão restaurada com sucesso!");
                reconnectAttempts = 0;
            })
            .catch(function(error) {
                console.error("❌ Falha na tentativa " + reconnectAttempts + ":", error.message);
                attemptReconnect(Math.min(delay * 2, 16000));
            });
    }, delay);
}

async function initializeFirebase() {
    try {
        if (!window.firebase || !window.firebase.apps || !window.firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log("✅ Firebase inicializado com sucesso!");
        }

        db = firebase.firestore();
        auth = firebase.auth();

        try {
            await db.enablePersistence({ synchronizeTabs: true });
            console.log("✅ Persistência offline ativada!");
        } catch (err) {
            if (err.code === 'failed-precondition') {
                console.warn("⚠️ Múltiplas abas abertas. Persistência desativada.");
            } else if (err.code === 'unimplemented') {
                console.warn("⚠️ Browser não suporta persistência offline.");
            } else {
                console.error("❌ Erro na persistência:", err);
            }
        }

        try {
            if (!db._settingsInitialized) {
                db.settings({
                    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
                    merge: true
                });
                db._settingsInitialized = true;
                console.log("✅ Configurações do Firestore aplicadas");
            }
        } catch (error) {
            console.warn("⚠️ Configurações do Firestore já foram aplicadas:", error.message);
        }

        window.addEventListener('online', function() {
            isOnline = true;
            console.log("🌐 Conexão restaurada!");
            reconnectAttempts = 0;
        });

        window.addEventListener('offline', function() {
            isOnline = false;
            console.log("📵 Modo offline ativado - Dados serão sincronizados quando voltar online");
        });

        if (navigator.onLine) {
            await db.collection('connectivity_test').limit(1).get();
            console.log("✅ Conexão com Firestore estabelecida!");
        } else {
            console.log("📵 Iniciando em modo offline");
        }

    } catch (error) {
        console.error("❌ Erro crítico na inicialização do Firebase:", error);
        if (error.message.includes('network') || error.message.includes('ERR_NAME_NOT_RESOLVED')) {
            console.log("🔄 Detectado problema de rede. Tentando reconexão automática...");
            attemptReconnect();
        } else {
            alert("Erro ao conectar com o banco de dados. Verifique o console para detalhes.");
        }
    }
}

initializeFirebase();
