import { useAuth } from "@/context/authcontext";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Tabs, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { TouchableOpacity } from "react-native";

export default function TabLayout() {
  const router = useRouter();
  const segments = useSegments();
  const user = useAuth();
  useEffect(() => {
    if (!user.isUser && segments[0] === "(tabs)") {
      router.replace("/");
    }
  }, [user.isUser, segments, router]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#fff",
        tabBarButton: ({ children, ...props }) => (
          <TouchableOpacity
            activeOpacity={1} // Removes touch opacity effect
            {...Object.fromEntries(
              Object.entries(props).filter(
                ([key, value]) => !(key === "delayLongPress" && value === null),
              ),
            )}
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {children}
          </TouchableOpacity>
        ),
        tabBarStyle: {
          backgroundColor: "#4abd3e",
          position: "absolute",
          borderRadius: 30,
          marginBottom: 10,
          marginHorizontal: 15,
          borderTopWidth: 0,
          height: 60,
          paddingBottom: 5,
          paddingTop: 5,
          elevation: 0,
        },

        tabBarInactiveTintColor: "#ccc",
        // tabBarActiveTintColor: "#eeba15",
        headerStyle: {
          backgroundColor: "#4abd3e",
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
          fontSize: 24,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "EcoCircle",
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons
              name="eco"
              size={24}
              color={color}
              style={{ opacity: focused ? 1 : 0.7 }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="posts"
        options={{
          title: "Posts",
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons
              name="article"
              size={24}
              color={color}
              style={{ opacity: focused ? 1 : 0.7 }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
