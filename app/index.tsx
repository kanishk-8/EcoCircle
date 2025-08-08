import { useAuth } from "@/context/authcontext";
import { supabase } from "@/utils/supabase";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, {
  BottomSheetView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import LottieView from "lottie-react-native";
import {
  Alert,
  AppState,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

const landingpage = () => {
  const bottomSheetRef = useRef(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [sheetIndex, setSheetIndex] = useState(-1);
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (auth.isUser) {
      router.replace("/(tabs)/home");
    }
  }, [auth.isUser, router]);

  const snapPoints = ["50%", "85%"]; // index 0 = 50%, index 1 = 85%

  const handleOpenSignup = () => {
    setIsBottomSheetOpen(true); // must be set before sheet responds to keyboard
    bottomSheetRef.current?.snapToIndex(0); // 50%
  };

  const [loading, setLoading] = useState(false);

  async function handleAuth() {
    setLoading(true);
    try {
      if (isSignUp) {
        const { error, session } = await auth.signup(emailAddress, password);
        if (error) Alert.alert(error.message);
        else Alert.alert("Please check your inbox for email verification!");
      } else {
        await auth.login(emailAddress, password);
        router.push("/(tabs)/home");
      }
    } catch (error: any) {
      Alert.alert(error.message);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LottieView
        autoPlay
        loop={false}
        style={styles.lottieAnimation}
        source={require("../assets/images/plant.json")}
      />
      <Text style={styles.title}>Welcome to EcoCircle</Text>
      <Text style={styles.subtitle}>
        Join us in making the world a greener place, one plant at a time!
      </Text>
      <TouchableOpacity style={styles.button} onPress={handleOpenSignup}>
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>
      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        index={-1}
        enablePanDownToClose={true}
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        onClose={() => {
          setIsBottomSheetOpen(false);
          setSheetIndex(-1);
        }}
        onChange={(index) => {
          setSheetIndex(index); // 👈 capture current index
          setIsBottomSheetOpen(index !== -1);
          if (index === -1) {
            setIsBottomSheetOpen(false);
          }
        }}
        style={styles.bottomSheet}
      >
        <BottomSheetView style={styles.bottomSheetContent}>
          <Text style={styles.signupTitle}>
            {isSignUp ? "Create Account" : "Welcome Back!"}
          </Text>
          <BottomSheetTextInput
            placeholder="Email"
            value={emailAddress}
            onChangeText={setEmailAddress}
            style={styles.input}
            placeholderTextColor="#999"
          />
          <BottomSheetTextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            placeholderTextColor="#999"
          />
          <TouchableOpacity style={styles.signinButton} onPress={handleAuth}>
            <Text style={styles.signinButtonText}>
              {isSignUp ? "Sign Up" : "Sign In"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.oauthButton} onPress={() => {}}>
            <Ionicons name="logo-google" size={24} color="#4abd3e" />
            <Text style={styles.oauthButtonText}>Sign in with Google</Text>
          </TouchableOpacity>
          <View style={styles.signupFooter}>
            <Text style={styles.footerText}>
              {isSignUp ? "Already have an account?" : "Don't have an account?"}
            </Text>
            <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
              <Text style={styles.signupLink}>
                {isSignUp ? "Sign In" : "Sign Up"}
              </Text>
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
};

export default landingpage;

const styles = StyleSheet.create({
  logo: {
    height: 100,
    width: 100,
    marginBottom: 20,
    textAlign: "center",
  },
  test: {
    fontSize: 30,
    textAlign: "center",
    marginBottom: 20,
    marginLeft: 130,
    marginTop: -80,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  subtitle: {
    fontSize: 18,
    color: "#666",
    marginBottom: 32,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: "#4abd3e", // Changed from #3fa4d1 to green
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    elevation: 2,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  bottomSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  bottomSheetContent: {
    flex: 1,
    padding: 20,
  },
  signupTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4abd3e", // Changed from #3fa4d1 to green
    marginBottom: 30,
    textAlign: "center",
  },
  signupText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    width: "100%",
    height: 50,
    borderRadius: 10,
    borderColor: "#ddd",
    borderWidth: 1,
    padding: 10,
    marginBottom: 15,
    backgroundColor: "#f9f9f9",
    fontSize: 16,
    color: "#333",
  },
  signinButton: {
    backgroundColor: "#4abd3e", // Changed from #3fa4d1 to green
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 15,
    elevation: 2,
  },
  signinButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  oauthButton: {
    flexDirection: "row",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
    borderColor: "#4abd3e", // Changed from #3fa4d1 to green
    borderWidth: 1,
  },
  oauthButtonText: {
    color: "#4abd3e", // Changed from #3fa4d1 to green
    marginLeft: 10,
    fontSize: 18,
    fontWeight: "bold",
  },
  signupFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 15,
  },
  footerText: {
    color: "#666",
    marginRight: 5,
  },
  signupLink: {
    color: "#4abd3e", // Changed from #3fa4d1 to green
    fontWeight: "bold",
  },
  lottieAnimation: {
    width: 400,
    height: 400,
  },
});
