import { AuthProvider } from "@/context/authcontext";
import { PostsProvider } from "@/context/postsContext";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <PostsProvider>
          <Stack>
            <Stack.Screen
              name="index"
              options={{
                title: "Home",
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="(tabs)"
              options={{
                headerShown: false,
              }}
            />
          </Stack>
        </PostsProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
