import { router } from "expo-router";
import { View } from "react-native";
import { AppText, Button, Card, Screen } from "@/components/ui";
import { colors, spacing } from "@/theme";

export type LegalSection = { title: string; paragraphs: string[] };

export function LegalDocument({ title, intro, sections }: { title: string; intro: string; sections: LegalSection[] }) {
  return <Screen maxWidth={760} safeTop>
    <View style={{ gap: spacing.sm }}>
      <AppText variant="title">{title}</AppText>
      <AppText variant="caption" color={colors.muted}>Oxirgi yangilanish: 13-oktabr, 2026-yil</AppText>
      <AppText color={colors.muted}>{intro}</AppText>
    </View>
    {sections.map((section) => <Card key={section.title}>
      <AppText variant="heading">{section.title}</AppText>
      {section.paragraphs.map((paragraph) => <AppText key={paragraph} color={colors.muted} selectable>{paragraph}</AppText>)}
    </Card>)}
    <Button title="Orqaga" variant="secondary" icon="arrow-back" onPress={() => router.canGoBack() ? router.back() : router.replace("/")} />
  </Screen>;
}
