import CentralLayout from '@/Layouts/CentralLayout';
import PageHeader from '@/Components/Central/PageHeader';
import StatusBadge from '@/Components/Central/StatusBadge';
import { formatMoney } from '@/Components/Central/formatters';
import { Link, router } from '@inertiajs/react';
import { CheckOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Col, Row, Space, Tag, Typography } from 'antd';

const capabilityLabels = { allow_pos:'Point of sale',allow_inventory:'Inventory',allow_hrm:'HR management',allow_crm:'CRM',allow_warehouse:'Warehouses',allow_ai:'AI tools',allow_custom_domain:'Custom domains',allow_multi_branch:'Multi-branch',allow_api_access:'API access' };

export default function Index({ plans = [] }) {
    return <CentralLayout title="Plans & pricing">
        <PageHeader eyebrow="Revenue configuration" title="Plans & pricing" description="Package limits, platform capabilities, trial periods, and billing prices for every tenant tier." actions={<Link href={route('central.plans.create')}><Button type="primary" icon={<PlusOutlined/>}>Create plan</Button></Link>}/>
        <Row gutter={[16,16]}>{plans.map((plan)=><Col xs={24} md={12} xl={8} key={plan.id}><Card className="central-section-card" style={{height:'100%',borderTop:plan.is_featured?'3px solid #0f766e':undefined}}>
            <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'flex-start'}}><div><Space wrap><Typography.Title level={4} style={{margin:0}}>{plan.name}</Typography.Title>{plan.is_featured&&<Tag color="cyan">Recommended</Tag>}</Space><Typography.Text type="secondary">{plan.trial_days || 0}-day trial · {plan.features_count || 0} linked features</Typography.Text></div><StatusBadge value={plan.is_active?'active':'disabled'}/></div>
            <div style={{margin:'24px 0 18px'}}><Typography.Title level={2} style={{margin:0,letterSpacing:'-.04em'}}>{formatMoney(plan.price_monthly,plan.currency)}</Typography.Title><Typography.Text type="secondary">per month · {formatMoney(plan.price_yearly,plan.currency)} yearly</Typography.Text></div>
            <Typography.Paragraph type="secondary" style={{minHeight:44}}>{plan.description || 'A flexible KiteLedger plan for growing teams.'}</Typography.Paragraph>
            <div style={{display:'grid',gap:9,margin:'18px 0'}}>{Object.entries(capabilityLabels).filter(([key])=>plan[key]).slice(0,5).map(([key,label])=><span key={key}><CheckOutlined style={{color:'#0f766e',marginRight:8}}/>{label}</span>)}{!Object.keys(capabilityLabels).some((key)=>plan[key])&&<Typography.Text type="secondary">No optional capabilities enabled</Typography.Text>}</div>
            <Button block icon={<EditOutlined/>} onClick={()=>router.visit(route('central.plans.edit',plan.id))}>Edit plan</Button>
        </Card></Col>)}</Row>
    </CentralLayout>;
}
