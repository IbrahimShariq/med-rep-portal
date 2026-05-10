// LoginScreen.jsx
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { login } from '../redux/slices/authSlice';
import Colors from '../utils/Colors';
import { Ionicons } from '@expo/vector-icons';
import { loginWithPortal, syncFromPortal } from '../database/syncService';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState({ appName: 'Med Rep', logoText: 'MR', logoUrl: '' });
  const router = useRouter();
  const dispatch = useDispatch();

  useEffect(() => {
    const loadBranding = async () => {
      try {
        const bootstrap = await syncFromPortal();
        if (bootstrap?.branding) setBranding(bootstrap.branding);
      } catch {
        // Keep local defaults if the portal API is not reachable.
      }
    };
    loadBranding();
  }, []);

  const handleLogin = async () => {
    if (email.trim() === '' || password.trim() === '') {
      Alert.alert('Missing Credentials', 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const result = await loginWithPortal({ email, password });
      await syncFromPortal(result.user.id);

      dispatch(login({
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role || 'REP',
          territory: result.user.territory,
          baseLatitude: result.user.baseLatitude,
          baseLongitude: result.user.baseLongitude,
          profilePicture: result.user.profilePicture,
        },
        token: result.token,
      }));

      router.replace('(tabs)/Home');
    } catch (err) {
      Alert.alert('Login Failed', err.message || 'Could not connect to the portal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
            <View style={styles.logoCircle}>
              {branding.logoUrl ? (
                <Image source={{ uri: branding.logoUrl }} style={styles.logoImage} />
              ) : (
                <Ionicons name="medical" size={40} color={Colors.white} />
              )}
            </View>
            <Text style={styles.title}>{branding.appName}</Text>
            <Text style={styles.subtitle}>Enter your credentials to access your dashboard</Text>
        </View>

        <View style={styles.form}>
            <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={Colors.lightgrey} style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    placeholder="Email Address"
                    placeholderTextColor={Colors.lightgrey}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
            </View>

            <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.lightgrey} style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor={Colors.lightgrey}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />
            </View>

            <TouchableOpacity style={styles.forgotBtn}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, loading && styles.disabledButton]} onPress={handleLogin} activeOpacity={0.8} disabled={loading}>
                {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.buttonText}>Sign In</Text>}
            </TouchableOpacity>
        </View>

        <View style={styles.footer}>
            <Text style={styles.footerText}>Don&apos;t have an account? </Text>
            <TouchableOpacity>
                <Text style={styles.linkText}>Contact Admin</Text>
            </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundwhite,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.darkgrey,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textgrey,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  form: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.bordergrey,
    borderRadius: 16,
    paddingHorizontal: 15,
    marginBottom: 16,
    height: 60,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.darkgrey,
    fontWeight: '500',
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 30,
  },
  forgotText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    height: 60,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.65,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 40,
  },
  footerText: {
    color: Colors.textgrey,
    fontSize: 14,
  },
  linkText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
