import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  StatusBar,
} from 'react-native';

const { width } = Dimensions.get('window');
const Colors = {
  primary: '#1a472a',      // أخضر داكن احترافي
  accent: '#d4a574',       // ذهبي فاتح
  background: '#f5f3f0',   // بيج فاتح
  text: '#2c2c2c',         // رمادي داكن
  lightText: '#666666',
  white: '#ffffff',
  border: '#e0e0e0',
  success: '#27ae60',
  warning: '#f39c12',
  error: '#e74c3c',
};

// بيانات العقارات العينة
const PropertiesData = [
  {
    id: 1,
    buildingNumber: 'A-101',
    unitNumber: 'شقة 1',
    address: 'الشيخ زايد، الجيزة',
    price: 2500000,
    bedrooms: 3,
    bathrooms: 2,
    status: 'متاح',
    type: 'بيع',
    furnished: true,
    furnishingType: 'فاخر',
    agent: 'محمد أحمد',
    image: '🏠',
    registrationDate: '2024-01-15',
  },
  {
    id: 2,
    buildingNumber: 'B-202',
    unitNumber: 'شقة 2',
    address: 'المعادي، القاهرة',
    price: 3200000,
    bedrooms: 4,
    bathrooms: 3,
    status: 'متاح',
    type: 'بيع',
    furnished: false,
    furnishingType: 'خام',
    agent: 'فاطمة محمود',
    image: '🏢',
    registrationDate: '2024-02-10',
  },
  {
    id: 3,
    buildingNumber: 'C-303',
    unitNumber: 'شقة 3',
    address: 'النيل، القاهرة',
    price: 1800000,
    bedrooms: 2,
    bathrooms: 1,
    status: 'مباع',
    type: 'بيع',
    furnished: true,
    furnishingType: 'كلاسيكي',
    agent: 'علي خليل',
    image: '🏘️',
    registrationDate: '2023-11-20',
  },
  {
    id: 4,
    buildingNumber: 'D-404',
    unitNumber: 'شقة 4',
    address: 'الرحاب، القاهرة',
    price: 45000,
    bedrooms: 3,
    bathrooms: 2,
    status: 'متاح',
    type: 'إيجار',
    furnished: true,
    furnishingType: 'حديث',
    agent: 'سارة علي',
    image: '🏙️',
    registrationDate: '2024-03-01',
  },
];

// Dashboard Component
function DashboardTab() {
  const [expandedId, setExpandedId] = useState(null);

  const getStatusColor = (status) => {
    switch (status) {
      case 'متاح':
        return Colors.success;
      case 'مباع':
        return Colors.error;
      default:
        return Colors.warning;
    }
  };

  const getStatusBgColor = (status) => {
    switch (status) {
      case 'متاح':
        return '#d4edda';
      case 'مباع':
        return '#f8d7da';
      default:
        return '#fff3cd';
    }
  };

  const formatPrice = (price) => {
    if (price < 100000) {
      return `${price.toLocaleString('ar-EG')} جنيه/شهر`;
    }
    return `${price.toLocaleString('ar-EG')} جنيه`;
  };

  const PropertyCard = ({ item }) => {
    const isExpanded = expandedId === item.id;

    return (
      <View style={[styles.propertyCard, isExpanded && styles.expandedCard]}>
        {/* Header Row */}
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => setExpandedId(isExpanded ? null : item.id)}
        >
          <View style={styles.headerLeft}>
            <Text style={styles.emoji}>{item.image}</Text>
            <View>
              <Text style={styles.buildingNumber}>{item.buildingNumber}</Text>
              <Text style={styles.address}>{item.address}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.price}>{formatPrice(item.price)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(item.status) }]}>
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {item.status}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Quick Info Row */}
        <View style={styles.quickInfo}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>غرف</Text>
            <Text style={styles.infoValue}>{item.bedrooms}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>حمامات</Text>
            <Text style={styles.infoValue}>{item.bathrooms}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>نوع</Text>
            <Text style={styles.infoValue}>{item.type}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>تشطيب</Text>
            <Text style={styles.infoValue}>{item.furnishingType}</Text>
          </View>
        </View>

        {/* Expanded Details */}
        {isExpanded && (
          <View style={styles.expandedDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>رقم الوحدة:</Text>
              <Text style={styles.detailValue}>{item.unitNumber}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>الوكيل العقاري:</Text>
              <Text style={styles.detailValue}>{item.agent}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>متشطبة:</Text>
              <Text style={styles.detailValue}>{item.furnished ? 'نعم - ' + item.furnishingType : 'خام'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>تاريخ التسجيل:</Text>
              <Text style={styles.detailValue}>{item.registrationDate}</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.dashboardHeader}>
        <Text style={styles.dashboardTitle}>Ring Roads</Text>
        <Text style={styles.dashboardSubtitle}>لوحة العقارات</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{PropertiesData.length}</Text>
          <Text style={styles.statLabel}>إجمالي العقارات</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{PropertiesData.filter(p => p.status === 'متاح').length}</Text>
          <Text style={styles.statLabel}>متاح الآن</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{PropertiesData.filter(p => p.type === 'بيع').length}</Text>
          <Text style={styles.statLabel}>للبيع</Text>
        </View>
      </View>

      <View style={styles.listContainer}>
        <FlatList
          data={PropertiesData}
          renderItem={({ item }) => <PropertyCard item={item} />}
          keyExtractor={(item) => item.id.toString()}
          scrollEnabled={false}
        />
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

// Commission Calculator Component
function CommissionTab() {
  const [buyerMoney, setBuyerMoney] = useState('30000');
  const [sellerMoney, setSellerMoney] = useState('50000');
  const [agentBuyerPercent, setAgentBuyerPercent] = useState('11');
  const [agentSellerPercent, setAgentSellerPercent] = useState('11');
  const [inspectionPercent, setInspectionPercent] = useState('5');
  const [managerPercent, setManagerPercent] = useState('2');

  const calculateCommissions = () => {
    const buyer = parseFloat(buyerMoney) || 0;
    const seller = parseFloat(sellerMoney) || 0;
    const totalMoney = buyer + seller;

    const buyerAgentComm = (parseFloat(agentBuyerPercent) || 0) / 100 * totalMoney;
    const sellerAgentComm = (parseFloat(agentSellerPercent) || 0) / 100 * totalMoney;
    const inspectionComm = (parseFloat(inspectionPercent) || 0) / 100 * totalMoney;
    const managerComm = (parseFloat(managerPercent) || 0) / 100 * totalMoney;

    const totalComm = buyerAgentComm + sellerAgentComm + inspectionComm + managerComm;

    return {
      totalMoney,
      buyerAgentComm,
      sellerAgentComm,
      inspectionComm,
      managerComm,
      totalComm,
    };
  };

  const results = calculateCommissions();

  const CommissionRow = ({ label, amount, percentage = null }) => (
    <View style={styles.commissionRow}>
      <Text style={styles.commissionLabel}>{label}</Text>
      {percentage && <Text style={styles.commissionPercent}>{percentage}%</Text>}
      <Text style={styles.commissionAmount}>
        {(amount || 0).toLocaleString('ar-EG', { maximumFractionDigits: 2 })} جنيه
      </Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.commissionHeader}>
        <Text style={styles.commissionTitle}>حساب العمولات</Text>
        <Text style={styles.commissionSubtitle}>احسب العمولات بسهولة</Text>
      </View>

      {/* Input Section */}
      <View style={styles.inputSection}>
        <Text style={styles.sectionTitle}>مبالغ المعاملة</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>مبلغ المشتري</Text>
          <TextInput
            style={styles.input}
            placeholder="أدخل المبلغ"
            value={buyerMoney}
            onChangeText={setBuyerMoney}
            keyboardType="decimal-pad"
            placeholderTextColor={Colors.lightText}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>مبلغ البائع</Text>
          <TextInput
            style={styles.input}
            placeholder="أدخل المبلغ"
            value={sellerMoney}
            onChangeText={setSellerMoney}
            keyboardType="decimal-pad"
            placeholderTextColor={Colors.lightText}
          />
        </View>
      </View>

      {/* Percentage Section */}
      <View style={styles.inputSection}>
        <Text style={styles.sectionTitle}>النسب المئوية للعمولات</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>عمولة وكيل المشتري (%)</Text>
          <TextInput
            style={styles.input}
            placeholder="أدخل النسبة"
            value={agentBuyerPercent}
            onChangeText={setAgentBuyerPercent}
            keyboardType="decimal-pad"
            placeholderTextColor={Colors.lightText}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>عمولة وكيل البائع (%)</Text>
          <TextInput
            style={styles.input}
            placeholder="أدخل النسبة"
            value={agentSellerPercent}
            onChangeText={setAgentSellerPercent}
            keyboardType="decimal-pad"
            placeholderTextColor={Colors.lightText}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>عمولة الفحص (%)</Text>
          <TextInput
            style={styles.input}
            placeholder="أدخل النسبة"
            value={inspectionPercent}
            onChangeText={setInspectionPercent}
            keyboardType="decimal-pad"
            placeholderTextColor={Colors.lightText}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>عمولة مدير الصفقة (%)</Text>
          <TextInput
            style={styles.input}
            placeholder="أدخل النسبة"
            value={managerPercent}
            onChangeText={setManagerPercent}
            keyboardType="decimal-pad"
            placeholderTextColor={Colors.lightText}
          />
        </View>
      </View>

      {/* Results Section */}
      <View style={styles.resultsSection}>
        <Text style={styles.sectionTitle}>النتائج</Text>

        <View style={styles.totalMoneyBox}>
          <Text style={styles.totalMoneyLabel}>إجمالي المعاملة</Text>
          <Text style={styles.totalMoneyValue}>
            {results.totalMoney.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} جنيه
          </Text>
        </View>

        <CommissionRow
          label="عمولة وكيل المشتري"
          amount={results.buyerAgentComm}
          percentage={agentBuyerPercent}
        />

        <CommissionRow
          label="عمولة وكيل البائع"
          amount={results.sellerAgentComm}
          percentage={agentSellerPercent}
        />

        <CommissionRow
          label="عمولة الفحص"
          amount={results.inspectionComm}
          percentage={inspectionPercent}
        />

        <CommissionRow
          label="عمولة مدير الصفقة"
          amount={results.managerComm}
          percentage={managerPercent}
        />

        <View style={styles.totalCommissionBox}>
          <Text style={styles.totalCommissionLabel}>إجمالي العمولات</Text>
          <Text style={styles.totalCommissionValue}>
            {results.totalComm.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} جنيه
          </Text>
        </View>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

// Main App Component
export default function RingRoadsApp() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <View style={styles.appContainer}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {activeTab === 'dashboard' ? <DashboardTab /> : <CommissionTab />}

      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'dashboard' && styles.activeTab]}
          onPress={() => setActiveTab('dashboard')}
        >
          <Text style={[styles.tabLabel, activeTab === 'dashboard' && styles.activeTabLabel]}>
            📊 لوحة المعلومات
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'commission' && styles.activeTab]}
          onPress={() => setActiveTab('commission')}
        >
          <Text style={[styles.tabLabel, activeTab === 'commission' && styles.activeTabLabel]}>
            💰 العمولات
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  bottomPadding: {
    height: 80,
  },

  // Dashboard Styles
  dashboardHeader: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  dashboardTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 4,
  },
  dashboardSubtitle: {
    fontSize: 14,
    color: Colors.accent,
  },

  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 6,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: Colors.accent,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.lightText,
    textAlign: 'center',
  },

  listContainer: {
    paddingHorizontal: 16,
  },
  propertyCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  expandedCard: {
    borderColor: Colors.accent,
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  emoji: {
    fontSize: 32,
    marginRight: 12,
  },
  buildingNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 4,
  },
  address: {
    fontSize: 13,
    color: Colors.lightText,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },

  quickInfo: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 11,
    color: Colors.lightText,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },

  expandedDetails: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.lightText,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },

  // Commission Styles
  commissionHeader: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  commissionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 4,
  },
  commissionSubtitle: {
    fontSize: 14,
    color: Colors.accent,
  },

  inputSection: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 20,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.accent,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
    backgroundColor: Colors.background,
  },

  resultsSection: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 20,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
  },
  totalMoneyBox: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.accent,
  },
  totalMoneyLabel: {
    fontSize: 12,
    color: Colors.lightText,
    marginBottom: 4,
  },
  totalMoneyValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },

  commissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  commissionLabel: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500',
    flex: 1,
  },
  commissionPercent: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '600',
    marginHorizontal: 8,
    minWidth: 35,
    textAlign: 'right',
  },
  commissionAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    minWidth: 120,
    textAlign: 'right',
  },

  totalCommissionBox: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  totalCommissionLabel: {
    fontSize: 12,
    color: Colors.accent,
    marginBottom: 8,
  },
  totalCommissionValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
  },

  // Tab Navigation
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingBottom: 24,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: Colors.primary,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.lightText,
  },
  activeTabLabel: {
    color: Colors.white,
  },
});
